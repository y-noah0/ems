// cronJobs.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const Term = require('../models/term');
const School = require('../models/school');
const { promoteStudents, transitionStudentsToNextTerm } = require('../controllers/promotionController');

// Initialize cron job
const startCronJobs = () => {
    // Run daily at 08:45 AM CAT (UTC+2)
    cron.schedule('45 8 * * *', async () => {
        console.log('Running term end check cron job at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));

        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            // Get all active schools
            const schools = await School.find({ isDeleted: false }).session(session);

            for (const school of schools) {
                const schoolId = school._id;
                // Get all terms for the current year (assuming current academic year based on date)
                const currentYear = new Date().getFullYear();
                const terms = await Term.find({
                    school: schoolId,
                    academicYear: currentYear,
                    isDeleted: false
                }).sort({ termNumber: 1 }).session(session);

                if (terms.length === 0) {
                    console.log(`No terms found for school ${schoolId} in ${currentYear}`);
                    continue;
                }

                const currentDate = new Date();

                for (const term of terms) {
                    if (currentDate >= term.endDate) {
                        // Check if term has already been processed
                        const isProcessed = await PromotionLog.exists({
                            school: schoolId,
                            academicYear: term.academicYear,
                            fromTerm: term._id,
                            status: 'termTransition',
                            cronJob: true
                        }).session(session);

                        if (term.termNumber < 3 && !isProcessed) {
                            // Transition to next term (Term 1 -> Term 2, Term 2 -> Term 3)
                            console.log(`Processing term transition for school ${schoolId}, term ${term.termNumber}, year ${term.academicYear}`);
                            await transitionStudentsToNextTerm({
                                body: {
                                    schoolId: schoolId.toString(),
                                    academicYear: term.academicYear,
                                    currentTermNumber: term.termNumber,
                                    cronJob: true
                                }
                            }, {
                                status: (code) => ({
                                    json: (data) => console.log(`Term transition result for school ${schoolId}, term ${term.termNumber}:`, data)
                                })
                            });
                        } else if (term.termNumber === 3 && terms.length === 3) {
                            // Check if promotion already processed
                            const isPromotionProcessed = await PromotionLog.exists({
                                school: schoolId,
                                academicYear: term.academicYear,
                                status: { $in: ['promoted', 'graduated', 'repeated', 'expelled'] },
                                cronJob: true
                            }).session(session);

                            if (!isPromotionProcessed) {
                                // Run promotion after Term 3
                                console.log(`Processing promotion for school ${schoolId}, year ${term.academicYear}`);
                                await promoteStudents({
                                    body: {
                                        schoolId: schoolId.toString(),
                                        academicYear: term.academicYear,
                                        cronJob: true
                                    }
                                }, {
                                    status: (code) => ({
                                        json: (data) => console.log(`Promotion result for school ${schoolId}:`, data)
                                    })
                                });
                            }
                        }
                    }
                }
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            console.error('Cron job error:', error);
        } finally {
            session.endSession();
        }
    }, {
        timezone: 'Africa/Johannesburg' // CAT (UTC+2)
    });

    console.log('Cron jobs initialized');
};

module.exports = { startCronJobs };