// Helper function to rank students or teachers
async function rankItems(items, scopeField) {
    try {
        // Filter out items with invalid scores
        const validItems = items.filter(item => {
            const score = item.totalScore ?? item.averageScore;
            return score !== undefined && score !== null;
        });

        if (validItems.length === 0) {
            return; // No valid items to rank
        }

        // Sort items by score in descending order (higher score = lower rank number)
        validItems.sort((a, b) => {
            const aScore = a.totalScore ?? a.averageScore;
            const bScore = b.totalScore ?? b.averageScore;
            return bScore - aScore;
        });

        if (scopeField === 'student') {
            // Rank students within a class
            const classId = validItems[0]?.class?._id ?? validItems[0]?.class;
            if (!classId) {
                validItems.forEach(item => {
                    item.rank = 0;
                    return item.save();
                });
                return;
            }

            const totalInClass = await ReportCard.countDocuments({
                class: classId,
                isDeleted: false,
            }).exec();

            if (totalInClass > 0) {
                await Promise.all(validItems.map(async (item, index) => {
                    const position = index + 1; // 1-based position
                    item.rank = Number((position / totalInClass).toFixed(4)); // Fractional rank
                    await item.save();
                }));
            } else {
                await Promise.all(validItems.map(async item => {
                    item.rank = 0;
                    await item.save();
                }));
            }
        } else if (scopeField === 'teacher') {
            // Rank teachers within a school
            const schoolId = validItems[0]?.school?._id ?? validItems[0]?.school;
            if (!schoolId) {
                validItems.forEach(item => {
                    item.rank = 0;
                    return item.save();
                });
                return;
            }

            const totalTeachers = await User.countDocuments({
                school: schoolId,
                role: 'teacher',
                isDeleted: false,
            }).exec();

            if (totalTeachers > 0) {
                await Promise.all(validItems.map(async (item, index) => {
                    const position = index + 1; // 1-based position
                    item.rank = Number((position / totalTeachers).toFixed(4)); // Fractional rank
                    await item.save();
                }));
            } else {
                await Promise.all(validItems.map(async item => {
                    item.rank = 0;
                    await item.save();
                }));
            }
        } else {
            // Default ranking for other scopes (e.g., term, school, trade, subject)
            let currentRank = 0;
            let lastScore = null;
            let sameRankCount = 0;

            await Promise.all(validItems.map(async (item, index) => {
                const score = item.totalScore ?? item.averageScore;
                if (score !== lastScore) {
                    currentRank = index + 1;
                    lastScore = score;
                    sameRankCount = 1;
                } else {
                    sameRankCount++;
                }
                item.rank = currentRank;
                await item.save();
            }));
        }
    } catch (error) {
        console.error(`Error ranking ${scopeField}:`, error);
        throw error;
    }
}