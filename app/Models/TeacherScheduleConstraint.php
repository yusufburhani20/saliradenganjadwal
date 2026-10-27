<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherScheduleConstraint extends Model
{
    protected $guarded = ['id'];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
