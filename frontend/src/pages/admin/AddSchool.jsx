import { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import trades from '../../data/trades.json';
import Button from "../../components/ui/Button";
export default function AddSchool() {
    const [selectedSystems, setSelectedSystems] = useState([]);
    const [selectedLevels, setSelectedLevels] = useState({});
    const [selectedTrades, setSelectedTrades] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [availableLevels, setAvailableLevels] = useState({});
    const [availableTrades, setAvailableTrades] = useState({});
    
    useEffect(() => {
        // Initialize available levels from the trades data
        setAvailableLevels({
            "REB": [...Object.keys(trades.REB.alevel), ...trades.REB.olevel],
            "TVET": Object.keys(trades.TVET)
        });
    }, []);
    
    // Handle system selection
    const handleSystemChange = (e) => {
        const { value, checked } = e.target;
        let updatedSystems;
        
        if (checked) {
            updatedSystems = [...selectedSystems, value];
        } else {
            updatedSystems = selectedSystems.filter(sys => sys !== value);
            
            // Clean up selectedLevels and selectedTrades for this system
            const updatedLevels = { ...selectedLevels };
            delete updatedLevels[value];
            setSelectedLevels(updatedLevels);
            
            const updatedTrades = { ...selectedTrades };
            delete updatedTrades[value];
            setSelectedTrades(updatedTrades);
        }
        
        setSelectedSystems(updatedSystems);
        updateAvailableTrades(selectedLevels);
    };
    
    // Handle level selection
    const handleLevelChange = (system, level, checked) => {
        const updatedLevels = { ...selectedLevels };
        
        if (!updatedLevels[system]) {
            updatedLevels[system] = [];
        }
        
        if (checked) {
            updatedLevels[system] = [...updatedLevels[system], level];
        } else {
            updatedLevels[system] = updatedLevels[system].filter(l => l !== level);
            
            // Clean up selectedTrades for this level
            const updatedTrades = { ...selectedTrades };
            if (updatedTrades[system]) {
                delete updatedTrades[system][level];
            }
            setSelectedTrades(updatedTrades);
        }
        
        setSelectedLevels(updatedLevels);
        updateAvailableTrades(updatedLevels);
    };
    
    // Update available trades based on selected levels
    const updateAvailableTrades = (levels) => {
        const newAvailableTrades = {};
        
        Object.entries(levels).forEach(([system, selectedLevels]) => {
            newAvailableTrades[system] = {};
            
            if (system === "REB") {
                selectedLevels.forEach(level => {
                    if (trades.REB.olevel.includes(level)) {
                        // For O-level, there are no specific combinations
                        newAvailableTrades[system][level] = ["General"];
                    } else {
                        // For A-level, use the combinations
                        newAvailableTrades[system][level] = trades.REB.alevel[level];
                    }
                });
            } else if (system === "TVET") {
                selectedLevels.forEach(level => {
                    newAvailableTrades[system][level] = trades.TVET[level];
                });
            }
        });
        
        setAvailableTrades(newAvailableTrades);
    };
    
    // Handle trade selection
    const handleTradeChange = (system, level, trade, checked) => {
        const updatedTrades = { ...selectedTrades };
        
        if (!updatedTrades[system]) {
            updatedTrades[system] = {};
        }
        
        if (!updatedTrades[system][level]) {
            updatedTrades[system][level] = [];
        }
        
        if (checked) {
            updatedTrades[system][level] = [...updatedTrades[system][level], trade];
        } else {
            updatedTrades[system][level] = updatedTrades[system][level].filter(t => t !== trade);
        }
        
        setSelectedTrades(updatedTrades);
    };
    
    // Filter trades based on search term
    const filterTrades = (trades) => {
        if (!searchTerm) return trades;
        return trades.filter(trade => 
            trade.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };
    return (
        <Layout>
            <div className="px-6 py-4 bg-white shadow-xl rounded-lg border border-black/8">
                <div className="flex justify-between border-b pb-2 border-b-black/10">
                    <h1 className="title">Add School</h1>
                    <Button to='/admin/schools' variant="outline" size="sm">
                        Back
                    </Button>
                </div>
                {/* For for school name, school code, trades offered, email, phone number, headmaster, headmaster phone, headmaster email */}
                <form className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-black/10">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">School Name</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 h-[30px] px-6 p-4" placeholder="Enter school name" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">School Code</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 h-[30px] px-6 p-4" placeholder="Enter school code" required />
                        </div>

                        {/* System Selection */}
                        
                        
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" className="mt-1 block w-full border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 h-[30px] px-6 p-4" placeholder="Enter email" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input type="tel" className="mt-1 block w-full border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 h-[30px] px-6 p-4" placeholder="Enter phone number" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Headmaster Name</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 h-[30px] px-6 p-4" placeholder="Enter headmaster name" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Headmaster Phone</label>
                            <input type="tel" className="mt-1 block w-full border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 h-[30px] px-6 p-4" placeholder="Enter headmaster phone" required />
                        </div>
                    </div>
                    <div className="border border-black/10 rounded-lg p-4 mt-4 bg-white">
                    <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Education System</label>
                            <div className=" rounded-lg overflow-hidden">
                                <div className="flex justify-between gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const isSelected = selectedSystems.includes("REB");
                                            handleSystemChange({target: {value: "REB", checked: !isSelected}});
                                        }}
                                        className={`w-1/2 py-3 text-center text-sm font-medium border border-black/10 rounded-lg ${
                                            selectedSystems.includes("REB")
                                                ? "bg-main-blue text-white"
                                                : "bg-gray-100 text-main-gray hover:bg-gray-200"
                                        }`}
                                    >
                                        REB (National)
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const isSelected = selectedSystems.includes("TVET");
                                            handleSystemChange({target: {value: "TVET", checked: !isSelected}});
                                        }}
                                        className={`w-1/2 py-3 text-center text-sm font-medium border border-black/10 rounded-lg ${
                                            selectedSystems.includes("TVET")
                                                ? "bg-main-blue text-white"
                                                : "bg-gray-100 text-main-gray hover:bg-gray-200"
                                        }`}
                                    >
                                        TVET
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Level Selection */}
                        {selectedSystems.length > 0 && (
                            <div className="md:col-span-2 mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Select Levels</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* REB Levels */}
                                    {selectedSystems.includes("REB") && (
                                        <div className="border border-black/10 rounded-lg p-4">
                                            <h3 className="font-medium text-sm text-gray-700 mb-2 pb-1 border-b border-b-black/10">REB System</h3>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                                {availableLevels["REB"] && availableLevels["REB"].map(level => (
                                                    <button 
                                                        type="button"
                                                        key={`REB-${level}`} 
                                                        onClick={() => handleLevelChange("REB", level, !selectedLevels["REB"]?.includes(level))}
                                                        className={`
                                                            px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm
                                                            ${selectedLevels["REB"]?.includes(level) 
                                                                ? "bg-blue-50 border-blue-300 shadow-sm" 
                                                                : "bg-white border-gray-300 hover:bg-gray-50 text-main-gray"}
                                                        `}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* TVET Levels */}
                                    {selectedSystems.includes("TVET") && (
                                        <div className="border border-black/10 rounded-lg p-4">
                                            <h3 className="font-medium text-sm text-gray-700 mb-2 pb-1 border-b border-b-black/10">TVET System</h3>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                                {availableLevels["TVET"] && availableLevels["TVET"].map(level => (
                                                    <button 
                                                        type="button"
                                                        key={`TVET-${level}`} 
                                                        onClick={() => handleLevelChange("TVET", level, !selectedLevels["TVET"]?.includes(level))}
                                                        className={`
                                                            px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm
                                                            ${selectedLevels["TVET"]?.includes(level) 
                                                                ? "bg-blue-50 border-blue-300 shadow-sm" 
                                                                : "bg-white border-gray-300 hover:bg-gray-50 text-main-gray"}
                                                        `}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Trades/Combinations Selection */}
                        {Object.keys(availableTrades).length > 0 && (
                            <div className="md:col-span-2 mt-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Trades/Combinations</label>
                                    
                                    {/* Search filter */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search trades or combinations..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 h-[30px] text-sm focus:ring-blue-500 focus:border-blue-500 px-6 p-4"
                                        />
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* REB Trades/Combinations */}
                                    {availableTrades["REB"] && Object.keys(availableTrades["REB"]).length > 0 && (
                                        <div className="border border-black/10 rounded-lg p-4">
                                            <h3 className="font-medium text-sm text-gray-700 mb-3 pb-1 border-b border-b-black/10">REB System</h3>
                                            <div className="space-y-4">
                                                {Object.entries(availableTrades["REB"]).map(([level, trades]) => (
                                                    <div key={`REB-${level}`}>
                                                        <h4 className="text-sm font-medium mb-2">Level: {level}</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterTrades(trades).map(trade => (
                                                                <button 
                                                                    type="button"
                                                                    key={`REB-${level}-${trade}`} 
                                                                    onClick={() => handleTradeChange("REB", level, trade, !selectedTrades["REB"]?.[level]?.includes(trade))}
                                                                    className={`
                                                                        p-2 rounded-lg border cursor-pointer text-sm
                                                                        ${selectedTrades["REB"]?.[level]?.includes(trade) 
                                                                            ? "bg-blue-50 border-blue-300" 
                                                                            : "bg-white border-gray-200 hover:bg-gray-50 text-main-gray"}
                                                                    `}
                                                                >
                                                                    {trade}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* TVET Trades */}
                                    {availableTrades["TVET"] && Object.keys(availableTrades["TVET"]).length > 0 && (
                                        <div className="border border-black/8 rounded-lg p-4">
                                            <h3 className="font-medium text-sm text-gray-700 mb-3 pb-1 border-b border-b-black/8">TVET System</h3>
                                            <div className="space-y-4">
                                                {Object.entries(availableTrades["TVET"]).map(([level, trades]) => (
                                                    <div key={`TVET-${level}`}>
                                                        <h4 className="text-sm font-medium mb-2">Level: {level}</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterTrades(trades).map(trade => (
                                                                <button
                                                                    type="button" 
                                                                    key={`TVET-${level}-${trade}`}
                                                                    onClick={() => handleTradeChange("TVET", level, trade, !selectedTrades["TVET"]?.[level]?.includes(trade))}
                                                                    className={`
                                                                        p-2 rounded-lg border cursor-pointer text-sm
                                                                        ${selectedTrades["TVET"]?.[level]?.includes(trade) 
                                                                            ? "bg-blue-50 border-blue-300" 
                                                                            : "bg-white border-gray-200 hover:bg-gray-50 text-main-gray"}
                                                                    `}
                                                                >
                                                                    {trade}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        </div>
                    <div className="mt-6">
                        <button 
                            type="submit" 
                            className="bg-main-blue text-white px-4 py-2 rounded-lg shadow-sm hover:bg-main-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Add School
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
