import React, { useState } from "react";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";
import trades from "../../data/trades.json";

export default function TradesCatalog() {
    const [activeSystem, setActiveSystem] = useState("REB");
    const [searchTerm, setSearchTerm] = useState("");

    // Handle search filter
    const filterTrades = (tradesList) => {
        if (!searchTerm) return tradesList;
        return tradesList.filter((trade) =>
            trade.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    return (
        <Layout>
            <div className="px-6 py-4">
                <div className="flex justify-between  mb-12">
                    {/* System tabs */}
                    <div className="">
                        <div className="flex space-x-4">
                            <Button
                                size="sm"
                                variant={
                                    activeSystem === "REB"
                                        ? "primary"
                                        : "outline"
                                }
                                onClick={() => setActiveSystem("REB")}
                            >
                                REB National
                            </Button>
                            <Button
                                size="sm"
                                variant={
                                    activeSystem === "TVET"
                                        ? "primary"
                                        : "outline"
                                }
                                onClick={() => setActiveSystem("TVET")}
                            >
                                TVET
                            </Button>
                        </div>
                    </div>
                    <div className="relative w-64 h-7">
                        <input
                            type="text"
                            placeholder="Search trades or combinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 h-[30px] text-sm focus:ring-blue-500 focus:border-blue-500 px-6 p-4"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg
                                className="h-5 w-5 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>
                    <Button to={"/admin/trades/add"} size="xsm">
                        Add Trade
                    </Button>
                </div>

                {/* REB Content */}
                {activeSystem === "REB" && (
                    <div className="space-y-6">
                        {/* O-Level */}
                        <div className="border border-black/10 rounded-lg p-4">
                            <h2 className="text-lg font-medium mb-3 pb-1 border-b border-b-black/10">
                                O-Level
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {trades.REB.olevel.map((level) => (
                                    <div
                                        key={level}
                                        className="bg-gray-50 p-3 rounded-lg"
                                    >
                                        <h3 className="text-sm font-medium">
                                            {level}
                                        </h3>
                                        <p className="text-sm text-main-gray mt-1">
                                            General Education
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* A-Level */}
                        <div className="border border-black/10 rounded-lg p-4">
                            <h2 className="text-lg font-medium mb-3 pb-1 border-b border-b-black/10">
                                A-Level
                            </h2>

                            {Object.entries(trades.REB.alevel).map(
                                ([level, combinations]) => (
                                    <div key={level} className="mb-6 last:mb-0">
                                        <h3 className="text-md font-medium mb-3">
                                            {level}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {filterTrades(combinations).map(
                                                (combination) => (
                                                    <div
                                                        key={`${level}-${combination}`}
                                                        className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                                                    >
                                                        <span className="font-medium text-sm">
                                                            {combination}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* TVET Content */}
                {activeSystem === "TVET" && (
                    <div className="space-y-6">
                        {Object.entries(trades.TVET).map(
                            ([level, tradesList]) => (
                                <div
                                    key={level}
                                    className="border border-black/8 rounded-lg p-4"
                                >
                                    <h2 className="text-lg font-medium mb-3 pb-1 border-b border-b-black/8">
                                        Level: {level}
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {filterTrades(tradesList).map(
                                            (trade) => (
                                                <div
                                                    key={`${level}-${trade}`}
                                                    className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                                                >
                                                    <span className="font-medium text-sm">
                                                        {trade}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
