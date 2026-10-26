<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherUnavailability extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'day',
        'slot_index',
        'reason',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
