import { useState } from "react";
import Layout from "../../components/layout/Layout";
import tradesData from '../../data/mockTrades.json';
import Button from "../../components/ui/Button";

export default function AddSchool() {
    const [selectedTrades, setSelectedTrades] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'TVET',
        location: {
            district: '',
            sector: '',
            cell: ''
        },
        contact: {
            phone: '',
            email: '',
            website: ''
        },
        accreditation: 'WDA Accredited',
        establishedYear: new Date().getFullYear(),
        description: ''
    });
    
    // Get available trades
    const availableTrades = tradesData.trades;
    const filteredTrades = availableTrades.filter(trade =>
        trade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Handle trade selection
    const handleTradeChange = (tradeCode, checked) => {
        if (checked) {
            setSelectedTrades([...selectedTrades, tradeCode]);
        } else {
            setSelectedTrades(selectedTrades.filter(code => code !== tradeCode));
        }
    };
    
    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        const schoolData = {
            ...formData,
            trades: selectedTrades,
            createdAt: new Date().toISOString(),
            status: 'Active'
        };
        console.log('School data to submit:', schoolData);
        // Here you would typically make an API call to save the school
        alert('School added successfully! (This is a demo)');
    };

    return (
        <Layout>
            <div className="px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Add New School</h1>
                            <p className="text-sm text-gray-500 mt-1">Create a new educational institution profile</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => window.history.back()}
                        >
                            Cancel
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Information */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        School Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter school name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        School Code *
                                    </label>
                                    <input
                                        type="text"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter school code"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        School Type *
                                    </label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="TVET">TVET School</option>
                                        <option value="Secondary">Secondary School</option>
                                        <option value="Primary">Primary School</option>
                                        <option value="University">University</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Established Year
                                    </label>
                                    <input
                                        type="number"
                                        name="establishedYear"
                                        value={formData.establishedYear}
                                        onChange={handleInputChange}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Brief description of the school"
                                />
                            </div>
                        </div>

                        {/* Location Information */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        District *
                                    </label>
                                    <input
                                        type="text"
                                        name="location.district"
                                        value={formData.location.district}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="District"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sector *
                                    </label>
                                    <input
                                        type="text"
                                        name="location.sector"
                                        value={formData.location.sector}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Sector"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cell
                                    </label>
                                    <input
                                        type="text"
                                        name="location.cell"
                                        value={formData.location.cell}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Cell"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="contact.phone"
                                        value={formData.contact.phone}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="+250 XXX XXX XXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="contact.email"
                                        value={formData.contact.email}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="school@example.com"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        name="contact.website"
                                        value={formData.contact.website}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="https://www.school.edu.rw"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Available Trades */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Available Trades</h2>
                                <div className="text-sm text-gray-500">
                                    {selectedTrades.length} selected
                                </div>
                            </div>
                            
                            {/* Search */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Search trades..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            {/* Trades List */}
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                                {filteredTrades.map((trade) => (
                                    <label
                                        key={trade._id}
                                        className="flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTrades.includes(trade.code)}
                                            onChange={(e) => handleTradeChange(trade.code, e.target.checked)}
                                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {trade.name} ({trade.code})
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {trade.fullName}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                        {trade.type}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                        {trade.level}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            
                            {filteredTrades.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    {searchTerm ? "No trades found matching your search." : "No trades available."}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end space-x-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.history.back()}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!formData.name || !formData.code}>
                                Add School
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
