import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import schoolService from '../../services/schoolService';
import tradeService from '../../services/tradeService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Button from "../../components/ui/Button";
import authService from "../../services/authService";

export default function AddSchool() {
    const { id } = useParams();
    const [selectedTrades, setSelectedTrades] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        location: { district: '', sector: '', cell: '' },
        contact: { phone: '', email: '', website: '' },
        headmaster: '',
        logo: null,
        category: 'TVET'
    });
    const [trades, setTrades] = useState([]);
    const navigate = useNavigate();
    // const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load trades
    useEffect(() => {
        tradeService.getAllTrades()
            .then(setTrades)
            .catch(err => console.error('Failed to load trades', err));
    }, []);
    
    // If editing, load existing school data
    useEffect(() => {
        if (!id) return;
        // load existing school data for editing
        schoolService.getSchoolById(id)
            .then(school => {
                // Parse address safely
                const addr = school.address || '';
                const parts = addr.split(', ');
                const [district, sector, cell] = [parts[0]||'', parts[1]||'', parts[2]||''];
                setFormData({
                    name: school.name,
                    code: school.code || '',
                    location: { district, sector, cell },
                    contact: { phone: school.contactPhone, email: school.contactEmail, website: '' },
                    // Prepopulate headmaster with email for edit
                    headmaster: school.headmaster?.email || '',
                    logo: null,
                    category: school.category
                });
                setSelectedTrades(school.tradesOffered.map(t => t._id));
            })
            .catch(() => toast.error('Failed to load school'));
    }, [id]);

    // Filter trades by search term and selected school type
    const filteredTrades = trades.filter(trade =>
        // match trade category to selected school type
        trade.category === formData.category &&
        (
            trade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trade.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
    
    // Handle trade selection
    const handleTradeChange = (tradeId, checked) => {
        if (checked) {
            setSelectedTrades([...selectedTrades, tradeId]);
        } else {
            setSelectedTrades(selectedTrades.filter(id => id !== tradeId));
        }
    };
    
    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'logo' && files) {
            return setFormData(prev => ({ ...prev, logo: files[0] }));
        }
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

    // Handle form submission (create or update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Validate required fields
            if (!formData.name) {
                toast.error('Please provide a school name');
                return;
            }
            if (!formData.code) {
                toast.error('Please provide a school code');
                return;
            }
            if (!formData.category) {
                toast.error('Please select a school type');
                return;
            }
            //get headmaster ID from email
            if (!formData.headmaster) {
                toast.error('Please provide a headmaster email');
                return;
            }
            const headmaster = await authService.getHeadmaster(formData.headmaster);
            console.log('Headmaster fetched:', headmaster);
            
            if (!headmaster) {
                toast.error('Headmaster not found');
                return;
            }
            // submit as multipart/form-data
            const data = new FormData();
            data.append('name', formData.name);
            data.append('code', formData.code);
            data.append('address', `${formData.location.district}, ${formData.location.sector}, ${formData.location.cell}`);
            data.append('contactEmail', formData.contact.email);
            data.append('contactPhone', formData.contact.phone);
            // include school category
            data.append('category', formData.category);
            data.append('headmaster', headmaster.id);
            selectedTrades.forEach(id => data.append('tradesOffered', id));
            // Only append logo if a file is selected
            if (formData.logo && formData.logo instanceof File) {
                data.append('logo', formData.logo);
            }
            
            if (id) {
                // update mode
                await schoolService.updateSchool(id, data);
                toast.success('School updated successfully!');
            } else {
                await schoolService.createSchool(data);
                toast.success('School added successfully!');
            }
            navigate('/admin/schools');
        } catch (err) {
            console.error('Error adding school:', err);
            toast.error(err.response?.data?.message || 'Failed to add school');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit School' : 'Add New School'}</h1>
                            <p className="text-sm text-gray-500 mt-1">Create a new educational institution profile</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/admin/schools')}
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
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="" >Select school type</option>
                                        <option value="TVET">TVET School</option>
                                        <option value="REB">Secondary School</option>
                                        <option value="PRIMARY">Primary School</option>
                                        <option value="UNIVERSITY">University</option>
                                        <option value="CAMBRIDGE">Cambridge</option>
                                    </select>
                                </div>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Headmaster Email
                                    </label>
                                    <input
                                        type="email"
                                        name="headmaster"
                                        value={formData.headmaster}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Headmaster ID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Logo
                                    </label>
                                    <input
                                        type="file"
                                        name="logo"
                                        accept="image/*"
                                        onChange={handleInputChange}
                                        className="w-full text-sm"
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
                                            checked={selectedTrades.includes(trade._id)}
                                            onChange={(e) => handleTradeChange(trade._id, e.target.checked)}
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
                            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.code || !formData.category}>
                                {isSubmitting ? 'Submitting...' : (id ? 'Update School' : 'Add School')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
