import React, { useState } from "react";
import DynamicTable from "./DynamicTable";
import { FiChevronDown, FiPlus, FiX, FiEdit } from "react-icons/fi";

const TeacherManagement = () => {
  // Sample teacher data
  const [teachersData, setTeachersData] = useState([
    {
      id: 1,
      fullName: "Mutisa Mona Lisa",
      email: "monalas28@gmail.com",
      phone: "0788238923",
      regNo: "TCH232132",
      subjects: 3,
    },
    {
      id: 2,
      fullName: "Murama Jean d'Arc",
      email: "monalass28@gmail.com",
      phone: "0788233445",
      regNo: "TCH232133",
      subjects: 2,
    },
    // Add more teachers here
    {
      id: 3,
      fullName: "Niyonsaba Amani",
      email: "amani.niyonsaba@example.com",
      phone: "0788234567",
      regNo: "TCH232134",
      subjects: 4,
    },
    {
      id: 4,
      fullName: "Munyaneza Eric",
      email: "eric.munyaneza@example.com",
      phone: "0788234568",
      regNo: "TCH232135",
      subjects: 5,
    },
    {
      id: 5,
      fullName: "Uwase Chantal",
      email: "chantal.uwase@example.com",
      phone: "0788234569",
      regNo: "TCH232136",
      subjects: 6,
    },
    {
      id: 6,
      fullName: "Habimana Claude",
      email: "claude.habimana@example.com",
      phone: "0788234560",
      regNo: "TCH232137",
      subjects: 7,
    },
    {
      id: 7,
      fullName: "Mugisha Alice",
      email: "alice.mugisha@example.com",
      phone: "0788234561",
      regNo: "TCH232138",
      subjects: 8,
    },
    {
      id: 8,
      fullName: "Nkurunziza Paul",
      email: "paul.nkurunziza@example.com",
      phone: "0788234562",
      regNo: "TCH232139",
      subjects: 9,
    },
    {
      id: 9,
      fullName: "Ingabire Solange",
      email: "solange.ingabire@example.com",
      phone: "0788234563",
      regNo: "TCH232140",
      subjects: 10,
    },
    {
      id: 10,
      fullName: "Munyakazi Jean",
      email: "jean.munyakazi@example.com",
      phone: "0788234564",
      regNo: "TCH232141",
      subjects: 11,
    },
  ]);

  // Define columns for the teachers table
  const teacherColumns = [
    { key: "fullName", title: "Full student names", width: "30%" },
    { key: "email", title: "Email", width: "25%" },
    { key: "phone", title: "Phone", width: "20%" },
    { key: "subjects", title: "Subjects", width: "10%" },
  ];

  // Currently selected academic year
  const [academicYear, setAcademicYear] = useState("2025-2026");

  // Modal visibility states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Teacher form states
  const [newTeacher, setNewTeacher] = useState({
    fullName: "",
    email: "",
    phone: "",
    regNo: "",
  });

  const [editTeacher, setEditTeacher] = useState({
    id: null,
    fullName: "",
    email: "",
    phone: "",
    regNo: "",
  });

  // Handler functions
  const handleEdit = (teacher) => {
    setEditTeacher({
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      regNo: teacher.regNo,
    });
    setShowEditModal(true);
  };

  const handleDelete = (teacher) => {
    console.log("Delete teacher:", teacher);
    if (
      window.confirm(`Are you sure you want to delete ${teacher.fullName}?`)
    ) {
      setTeachersData(teachersData.filter((t) => t.id !== teacher.id));
    }
  };

  const handleAddTeacher = () => {
    setNewTeacher({
      fullName: "",
      email: "",
      phone: "",
      regNo: "",
    });
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewTeacher((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditTeacher((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateRandomRegNo = () => {
    const prefix = "TCH";
    const randomDigits = Math.floor(100000 + Math.random() * 900000)
      .toString()
      .substring(0, 6);
    const regNo = `${prefix}${randomDigits}`;

    setNewTeacher((prev) => ({
      ...prev,
      regNo,
    }));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();

    // Add validation here
    if (!newTeacher.fullName || !newTeacher.email || !newTeacher.phone) {
      alert("Please fill in all required fields");
      return;
    }

    // Add new teacher to the list
    const newTeacherData = {
      id: teachersData.length + 1,
      fullName: newTeacher.fullName,
      email: newTeacher.email,
      phone: newTeacher.phone,
      regNo: newTeacher.regNo,
      subjects: 0,
    };

    setTeachersData((prev) => [...prev, newTeacherData]);
    setShowAddModal(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();

    // Add validation here
    if (!editTeacher.fullName || !editTeacher.email || !editTeacher.phone) {
      alert("Please fill in all required fields");
      return;
    }

    // Update teacher in the list
    setTeachersData((prev) =>
      prev.map((teacher) =>
        teacher.id === editTeacher.id
          ? {
              ...teacher,
              fullName: editTeacher.fullName,
              email: editTeacher.email,
              phone: editTeacher.phone,
              regNo: editTeacher.regNo,
            }
          : teacher
      )
    );

    setShowEditModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-800">
          Teacher Management
        </h1>

        <div className="flex items-center gap-4">
          {/* Academic Year Dropdown */}
          <div className="relative">
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[140px]">
              {academicYear}
              <FiChevronDown />
            </button>
          </div>

          {/* Add Teacher Button */}
          <button
            onClick={handleAddTeacher}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
          >
            <FiPlus size={18} />
            <span>Teacher</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <DynamicTable
          data={teachersData}
          columns={teacherColumns}
          containerWidth="1040px" // Fixed width
          containerHeight="450px" // Fixed height
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleCloseAddModal}
          >
            {/* Modal Content */}
            <div
              className="bg-white rounded-lg w-full max-w-md p-6 relative"
              onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing modal
            >
              {/* Close Button */}
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={handleCloseAddModal}
              >
                <FiX size={24} />
              </button>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Names
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={newTeacher.fullName}
                    onChange={handleAddInputChange}
                    placeholder="Murama Jean d'Arc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newTeacher.email}
                    onChange={handleAddInputChange}
                    placeholder="monalass28@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={newTeacher.phone}
                      onChange={handleAddInputChange}
                      placeholder="0788233445"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="regNo"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Reg no.
                      </label>
                      <button
                        type="button"
                        className="text-blue-500 text-sm hover:text-blue-700"
                        onClick={generateRandomRegNo}
                      >
                        Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      id="regNo"
                      name="regNo"
                      value={newTeacher.regNo}
                      onChange={handleAddInputChange}
                      placeholder="TCH232132"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
                  >
                    <FiEdit size={18} />
                    Save Edits
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleCloseEditModal}
          >
            {/* Modal Content */}
            <div
              className="bg-white rounded-lg w-full max-w-md p-6 relative"
              onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing modal
            >
              {/* Close Button */}
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={handleCloseEditModal}
              >
                <FiX size={24} />
              </button>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="editFullName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Names
                  </label>
                  <input
                    type="text"
                    id="editFullName"
                    name="fullName"
                    value={editTeacher.fullName}
                    onChange={handleEditInputChange}
                    placeholder="Murama Jean d'Arc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editEmail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="editEmail"
                    name="email"
                    value={editTeacher.email}
                    onChange={handleEditInputChange}
                    placeholder="monalass28@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="editPhone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="editPhone"
                      name="phone"
                      value={editTeacher.phone}
                      onChange={handleEditInputChange}
                      placeholder="0788233445"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex-1">
                    <label
                      htmlFor="editRegNo"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Reg no.
                    </label>
                    <input
                      type="text"
                      id="editRegNo"
                      name="regNo"
                      value={editTeacher.regNo}
                      onChange={handleEditInputChange}
                      placeholder="TCH232132"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
                  >
                    <FiEdit size={18} />
                    Save Edits
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherManagement;
