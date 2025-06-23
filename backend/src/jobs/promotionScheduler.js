const cron = require('node-cron');
const promotionController = require('../controllers/promotionController');
const School = require('../models/School'); // Import your School model

cron.schedule('0 0 1 7 *', async () => {
    try {
        const schools = await School.find({}); // Get all schools

        for (const school of schools) {
            console.log(`Running promotion for school: ${school.name} (${school._id})`);

            // Call promoteStudents controller logic for each school
            await promotionController.promoteStudents({
                body: {
                    schoolId: school._id,
                    academicYear: new Date().getFullYear(),
                }
            }, {
                status: () => ({ json: (data) => console.log(`Promotion success for ${school.name}:`, data) }),
                json: (data) => console.log(`Promotion success for ${school.name}:`, data),
                statusCode: 500,
                send: (err) => console.error(`Promotion error for ${school.name}:`, err),
            });
        }

        console.log('All schools promotion process completed.');
    } catch (err) {
        console.error('Scheduled promotion job error:', err);
    }
});
