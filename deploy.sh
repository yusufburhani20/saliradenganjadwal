#!/bin/bash
# ==========================================
# SALIRA Auto Deployment Script for aaPanel
# ==========================================

LOG_PREFIX="[$(date '+%H:%M:%S')]"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# Nonaktifkan interaksi terminal untuk semua perintah git agar tidak stuck
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=echo
export SSH_ASKPASS=echo

# Fungsi untuk menangani error
die() {
    echo "$LOG_PREFIX ❌ ERROR: $1"
    echo "[PROCESS_FAILED]"
    exit 1
}

echo "$LOG_PREFIX 🚀 Memulai proses deployment SALIRA..."

# 1. Pindah ke direktori utama
cd "$APP_DIR" || die "Gagal masuk ke direktori $APP_DIR"

# Fix kepemilikan file agar user www bisa membaca/menulis (cegah EACCES pada .git/index)
chown -R www:www "$APP_DIR" 2>/dev/null || true

# 2. Menarik kode terbaru dari GitHub
# Mendukung repo privat via GITHUB_USER + GITHUB_TOKEN dari environment variable
echo "$LOG_PREFIX 📥 Menarik kode terbaru dari GitHub..."

if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_USER" ]; then
    # Bersihkan whitespace dari variabel
    GITHUB_USER=$(echo "$GITHUB_USER" | tr -d '[:space:]')
    GITHUB_TOKEN=$(echo "$GITHUB_TOKEN" | tr -d '[:space:]')
    
    # Ambil URL repo dari remote origin saat ini
    REPO_URL=$(git remote get-url origin)

    # Ekstrak domain dan path repo (mendukung HTTPS dan SSH)
    CLEAN_PATH=$(echo "$REPO_URL" | sed -E -e 's|https://([^@]+@)?github.com/||' -e 's|git@github.com:||' -e 's|\.git$||' | tr -d '[:space:]')
    
    # Hapus trailing slash jika ada
    CLEAN_PATH=${CLEAN_PATH%/}

    # Bentuk URL baru yang bersih dengan kredensial
    AUTHED_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${CLEAN_PATH}.git"
    
    # Fetch dengan URL yang sudah di-autentikasi
    git fetch "$AUTHED_URL" main 2>&1
else
    # Jika tidak ada token, coba fetch biasa (untuk repo publik atau SSH)
    git fetch origin main 2>&1
fi

if [ $? -ne 0 ]; then
    die "git fetch GAGAL! Pastikan Kredensial GitHub sudah diisi dengan benar di Pengaturan."
fi

# Reset hard ke FETCH_HEAD — ini sudah menyelaraskan seluruh working tree dengan GitHub
# (tidak perlu git clean -fd karena akan menghapus public/build yang sudah di-commit)
git reset --hard FETCH_HEAD 2>&1 || die "Gagal melakukan git reset --hard ke kode terbaru."

echo "$LOG_PREFIX ✅ git fetch dan reset berhasil."


# 3. Menginstall dependensi PHP (Composer)
echo "$LOG_PREFIX 📦 Memperbarui paket PHP (composer install)..."
/www/server/php/83/bin/php /usr/bin/composer install --no-dev --optimize-autoloader --no-interaction 2>&1 || die "Gagal memperbarui dependensi PHP (Composer)"

# 4. Menjalankan Migrasi Database
echo "$LOG_PREFIX 🗄️  Menjalankan migrasi database..."
/www/server/php/83/bin/php artisan migrate --force 2>&1 || die "Gagal menjalankan migrasi database"

# 5. Build Aset Frontend (React/Vite)
# Cek apakah aset frontend pre-built (public/build) sudah ada dan telah di-commit ke Git.
# Jika sudah ada, lewati proses npm install & build di server untuk mencegah lonjakan CPU & 502 Bad Gateway!
if [ -f "$APP_DIR/public/build/manifest.json" ]; then
    echo "$LOG_PREFIX ⏩ Aset frontend pre-built ditemukan (public/build/manifest.json)."
    echo "$LOG_PREFIX ⚡ Melewati npm run build di server untuk menjaga stabilitas & mencegah downtime website tetangga."
else
    echo "$LOG_PREFIX 🏗️  Aset pre-built tidak ditemukan, membangun aset frontend di server (npm run build)..."

    # Auto-detect npm di aaPanel / nvm
    NPM_BIN=""

    # Coba load nvm jika tersedia
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        # shellcheck disable=SC1090
        . "$NVM_DIR/nvm.sh" --no-use 2>/dev/null
        NPM_BIN="$(nvm which current 2>/dev/null | sed 's|/node$|/npm|')"
    fi

    # Fallback: cari npm di lokasi umum aaPanel & sistem
    if [ -z "$NPM_BIN" ] || [ ! -x "$NPM_BIN" ]; then
        for candidate in \
            /www/server/nodejs/v22*/bin/npm \
            /www/server/nodejs/v20*/bin/npm \
            /www/server/nodejs/v18*/bin/npm \
            /www/server/nodejs/v16*/bin/npm \
            /root/.nvm/versions/node/*/bin/npm \
            /usr/local/bin/npm \
            /usr/bin/npm; do
            # Ekspand glob dan ambil yang pertama
            for f in $candidate; do
                if [ -x "$f" ]; then
                    NPM_BIN="$f"
                    break 2
                fi
            done
        done
    fi

    if [ -z "$NPM_BIN" ]; then
        die "npm tidak ditemukan! Install Node.js di aaPanel dulu (Software Store → Node.js), lalu jalankan ulang deploy."
    fi

    echo "$LOG_PREFIX ✅ npm ditemukan: $NPM_BIN (versi: $("$NPM_BIN" --version 2>/dev/null))"

    # Fix permission cache npm (sering jadi root-owned di aaPanel)
    chown -R "$(id -u):$(id -g)" /www/server/nodejs/cache 2>/dev/null || true

    # Gunakan env var npm_config_cache agar log & cache semuanya dialihkan ke /tmp
    export npm_config_cache="/tmp/.npm-cache-salira"
    mkdir -p "$npm_config_cache"

    "$NPM_BIN" install --legacy-peer-deps 2>&1 || die "npm install GAGAL!"
    "$NPM_BIN" run build 2>&1 || die "npm run build GAGAL! Cek output di atas untuk detail error."
fi


# 6. Membersihkan Cache Laravel
echo "$LOG_PREFIX 🧹 Membersihkan cache sistem..."
/www/server/php/83/bin/php artisan optimize:clear 2>&1
/www/server/php/83/bin/php artisan view:clear 2>&1
/www/server/php/83/bin/php artisan route:clear 2>&1
/www/server/php/83/bin/php artisan config:clear 2>&1
/www/server/php/83/bin/php artisan cache:clear 2>&1

echo "$LOG_PREFIX ✅ DEPLOYMENT SELESAI SUKSES!"
echo "[PROCESS_COMPLETED]"
