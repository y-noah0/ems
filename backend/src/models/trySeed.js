const mongoose = require('mongoose');
const Exam = require('./Exam'); // Adjust path if needed

const MONGO_URI = 'mongodb://localhost:27017/school-exam-system'; // Change to your DB name

async function seed() {
    try {
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅ Connected to MongoDB');

        const examData = {
            title: 'Comprehensive Django & General Knowledge Exam',
            instructions: 'Please read each question carefully and provide accurate answers. Use the rich text editor for essay and short-answer questions to format your responses.',
            subject: '68960536d1910c3c0467c987',
            classes: ['6895e0e3c3dbc03e44b157d0'],
            term: '6895e0e3c3dbc03e44b15771',
            type: 'assessment1',
            teacher: '68960688d1910c3c0467c9ef',
            school: '68960420d1910c3c0467c7f5',
            questions: [
                // Multiple-choice questions
                {
                    text: 'What is the primary function of Django’s ORM?',
                    type: 'multiple-choice',
                    maxScore: 10,
                    correctAnswer: ['Object-Relational Mapping'],
                    options: [
                        { text: 'Object-Relational Mapping', isCorrect: true },
                        { text: 'Database Migration', isCorrect: false },
                        { text: 'Template Rendering', isCorrect: false },
                        { text: 'URL Routing', isCorrect: false },
                    ],
                },
                {
                    text: 'Which HTTP method is used for updating resources in Django REST Framework?',
                    type: 'multiple-choice',
                    maxScore: 10,
                    correctAnswer: ['PUT'],
                    options: [
                        { text: 'GET', isCorrect: false },
                        { text: 'POST', isCorrect: false },
                        { text: 'PUT', isCorrect: true },
                        { text: 'DELETE', isCorrect: false },
                    ],
                },
                {
                    text: 'What is the capital city of France?',
                    type: 'multiple-choice',
                    maxScore: 10,
                    correctAnswer: ['Paris'],
                    options: [
                        { text: 'London', isCorrect: false },
                        { text: 'Paris', isCorrect: true },
                        { text: 'Berlin', isCorrect: false },
                        { text: 'Madrid', isCorrect: false },
                    ],
                },
                {
                    text: 'Which planet is known as the Red Planet?',
                    type: 'multiple-choice',
                    maxScore: 10,
                    correctAnswer: ['Mars'],
                    options: [
                        { text: 'Venus', isCorrect: false },
                        { text: 'Mars', isCorrect: true },
                        { text: 'Jupiter', isCorrect: false },
                        { text: 'Saturn', isCorrect: false },
                    ],
                },
                // True-false questions
                {
                    text: 'Django is a Python-based web framework.',
                    type: 'true-false',
                    maxScore: 5,
                    correctAnswer: ['true'],
                },
                {
                    text: 'The Earth revolves around the Sun in 24 hours.',
                    type: 'true-false',
                    maxScore: 5,
                    correctAnswer: ['false'],
                },
                // True-false-labeled (same as true-false for simplicity)
                {
                    text: 'Django’s MTV stands for Model-Template-View.',
                    type: 'true-false-labeled',
                    maxScore: 5,
                    correctAnswer: ['true'],
                },
                {
                    text: 'Water boils at 50°C at standard pressure.',
                    type: 'true-false-labeled',
                    maxScore: 5,
                    correctAnswer: ['false'],
                },
                // True-false-statements
                {
                    text: 'Evaluate the following statements about Python and Django:',
                    type: 'true-false-statements',
                    maxScore: 15,
                    correctAnswer: ['true', 'false', 'true'],
                    options: [
                        { text: 'Python is a high-level programming language.', isCorrect: true },
                        { text: 'Django runs only on Windows servers.', isCorrect: false },
                        { text: 'Django supports rapid development.', isCorrect: true },
                    ],
                },
                {
                    text: 'Evaluate the following scientific statements:',
                    type: 'true-false-statements',
                    maxScore: 15,
                    correctAnswer: ['true', 'false', 'true'],
                    options: [
                        { text: 'The Sun is a star.', isCorrect: true },
                        { text: 'The Moon generates its own light.', isCorrect: false },
                        { text: 'Gravity affects all objects with mass.', isCorrect: true },
                    ],
                },
                // Short-answer questions
                {
                    text: 'Briefly explain what a Django model is.',
                    type: 'short-answer',
                    maxScore: 15,
                },
                {
                    text: 'What is the purpose of Django’s settings.py file?',
                    type: 'short-answer',
                    maxScore: 15,
                },
                {
                    text: 'Name one major source of renewable energy.',
                    type: 'short-answer',
                    maxScore: 10,
                },
                {
                    text: 'What is the main function of the human heart?',
                    type: 'short-answer',
                    maxScore: 10,
                },
                // Essay questions
                {
                    text: 'Discuss how Django’s MVT architecture differs from MVC.',
                    type: 'essay',
                    maxScore: 25,
                },
                {
                    text: 'Explain the significance of Django’s admin interface in web development.',
                    type: 'essay',
                    maxScore: 25,
                },
                {
                    text: 'Describe the causes and effects of climate change.',
                    type: 'essay',
                    maxScore: 20,
                },
                {
                    text: 'Discuss the importance of biodiversity in ecosystems.',
                    type: 'essay',
                    maxScore: 20,
                },
                {
                    text: 'Explain how REST APIs work in Django REST Framework.',
                    type: 'essay',
                    maxScore: 20,
                },
                {
                    text: 'Describe the historical significance of the Industrial Revolution.',
                    type: 'essay',
                    maxScore: 20,
                },
            ],
            schedule: {
                start: new Date('2025-08-11T15:39:00.000Z'),
                duration: 120, // 2 hours
            },
        };

        await Exam.deleteMany({}); // Clear existing exams
        const exam = new Exam(examData);
        await exam.save();

        console.log('✅ Exam seeded successfully:', exam._id);
    } catch (err) {
        console.error('❌ Error seeding exam:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

seed();