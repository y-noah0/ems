import React, { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';

const MultiSelect = ({ label, name, options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleAdd = (value) => {
        if (!selectedValues.includes(value)) {
            onChange([...selectedValues, value]);
        }
        setIsOpen(false);
    };

    const handleRemove = (value) => {
        onChange(selectedValues.filter((v) => v !== value));
    };

    const dropdownVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
    };

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between transition duration-200"
                >
                    <span className="text-gray-500">
                        {selectedValues.length > 0 ? `${selectedValues.length} selected` : `Select ${label.toLowerCase()}`}
                    </span>
                    <motion.div
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <FaPlus className="h-4 w-4 text-indigo-600" />
                    </motion.div>
                </button>
                {isOpen && (
                    <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                    >
                        {options.map((option) => (
                            <div
                                key={option._id}
                                onClick={() => handleAdd(option._id.toString())}
                                className={`px-4 py-2 cursor-pointer hover:bg-teal-50 flex items-center ${selectedValues.includes(option._id.toString()) ? 'bg-teal-100' : ''
                                    }`}
                            >
                                <span>{option.name || option.className || `${option.level}${option.trade?.code || ''}`}</span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                {selectedValues.map((value) => {
                    const option = options.find((o) => o._id.toString() === value);
                    return (
                        <motion.div
                            key={value}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center bg-teal-100 text-teal-800 px-2 py-1 rounded-full text-sm"
                        >
                            <span>{option?.name || option?.className || `${option?.level}${option?.trade?.code || ''}`}</span>
                            <FaTimes
                                className="h-4 w-4 ml-1 cursor-pointer hover:text-red-500"
                                onClick={() => handleRemove(value)}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultiSelect;