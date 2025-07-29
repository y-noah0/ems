/**
 * Check for scheduling conflicts
 * @param {ObjectId} examId - Exam ID (null for new exams)
 * @param {Array} classIds - Class IDs the exam is for
 * @param {Date} startDate - Exam start time in UTC
 * @param {Number} duration - Duration in minutes
 * @returns {Object} Conflict information or null
 */
exports.checkScheduleConflicts = async (examId, classIds, startDate, duration) => {
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

  const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));
  
  // Find exams that overlap with the proposed schedule
  const query = {
    _id: { $ne: examId }, // Exclude the current exam (for updates)
    classes: { $in: classIds }, // Same classes
    status: { $in: ['scheduled', 'active'] }, // Only active or scheduled exams matter
    isDeleted: false,
    $or: [
      // Case 1: New exam starts during an existing exam
      { 
        'schedule.start': { $lte: startDate },
        $expr: { 
          $gte: [
            { $add: ['$schedule.start', { $multiply: ['$schedule.duration', 60, 1000] }] },
            startDate.getTime()
          ] 
        }
      },
      // Case 2: New exam ends during an existing exam
      {
        'schedule.start': { $lte: endDate },
        'schedule.start': { $gte: startDate }
      },
      // Case 3: New exam completely contains an existing exam
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
    .select('title schedule classes')
    .populate('classes', 'level trade year term')
    .lean();

  if (conflictingExams.length > 0) {
    return {
      hasConflict: true,
      exams: conflictingExams
    };
  }

  return {
    hasConflict: false
  };
};