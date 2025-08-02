import React from "react";
import ReactSelect from "react-select";

const Select = ({
    options = [],
    value,
    onChange,
    placeholder = "Select...",
    isDisabled = false,
    className = "",
    ...props
}) => {
    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            maxheight: "30px",
            border: "1px solid #D1D5DB",
            borderRadius: "12px",
            paddingLeft: "10px",
            paddingRight: "4px",
            width: "fit-content",
            gap: "2px",
            boxShadow: "none",
            backgroundColor: "white",
            "&:hover": {
                border: "1px solid #9CA3AF",
            },
        }),
        placeholder: (provided) => ({
            ...provided,
            color: "#6B7280",
            fontSize: "14px",
            width: "fit-content",
        }),
        singleValue: (provided) => ({
            ...provided,
            color: "#374151",
            fontSize: "14px",
        }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: "#6B7280",
            paddingRight: "12px",
            "&:hover": {
                color: "#374151",
            },
        }),
        indicatorSeparator: () => ({
            display: "none",
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: "8px",
            boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "1px solid #E5E7EB",
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
                ? "#F3F4F6"
                : state.isFocused
                ? "#F3F4F6"
                : "white",
            color: state.isSelected ? "#6B7280" : "#374151",
            fontSize: "14px",
            "&:hover": {
                backgroundColor: state.isSelected ? "#3B82F6" : "#F3F4F6",
            },
        }),
    };

    return (
        <div className={className}>
            <ReactSelect
                styles={customStyles}
                options={options}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                isDisabled={isDisabled}
                {...props}
            />
        </div>
    );
};

export default Select;
