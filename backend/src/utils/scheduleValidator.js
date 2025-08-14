/**
 * Check for scheduling conflicts
 * @param {Array} classIds - Class IDs the exam is for
 * @param {Date} startDate - Exam start time in UTC
 * @param {Number} duration - Duration in minutes
 * @param {ObjectId} schoolId - School ID to scope the query
 * @param {ObjectId|null} examId - Exam ID (null for new exams)
 * @returns {Object} Conflict information or null
 */
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

exports.checkScheduleConflicts = async (classIds, startDate, duration, schoolId, examId = null) => {
  const Exam = require('../models/Exam');

  if (!Array.isArray(classIds) || classIds.length === 0) {
    throw new Error('At least one class ID is required');
  }

  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error('Valid start date is required');
  }

  if (!Number.isInteger(duration) || duration < 5) {
    throw new Error('Duration must be at least 5 minutes');
  }

  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error('Valid school ID is required');
  }
  const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));
  console.log('Computed endDate:', endDate);

  const query = {
    _id: { $ne: examId },
    classes: { $in: classIds },
    school: schoolId,
    status: { $in: ['scheduled', 'active'] },
    isDeleted: false,
    $or: [
      {
        'schedule.start': { $lte: startDate },
        $expr: {
          $gte: [
            { $add: ['$schedule.start', { $multiply: ['$schedule.duration', 60, 1000] }] },
            startDate.getTime()
          ]
        }
      },
      {
        $and: [
          { 'schedule.start': { $lte: endDate } },
          { 'schedule.start': { $gte: startDate } }
        ]
      },
      {
        'schedule.start': { $gte: startDate },
        $expr: {
          $lte: [
            { $add: ['$schedule.start', { $multiply: ['$schedule.duration', 60, 1000] }] },
            endDate.getTime()
          ]
        }
      }
    ]
  };


  const conflictingExams = await Exam.find(query)
    .select('title schedule classes status isDeleted')
    .populate('classes', 'level trade year term')
    .lean();

  console.log('Query returned exams:', conflictingExams);

  if (conflictingExams.length > 0) {
    console.log('❌ Conflict detected with:', conflictingExams.map(e => e.title));
    return {
      hasConflict: true,
      exams: conflictingExams
    };
  }

  console.log('✅ No conflicts found.');
  return {
    hasConflict: false
  };
};
