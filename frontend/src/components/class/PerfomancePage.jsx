import React from "react";
import ClassPerformance from "./ClassPerfomance";
import Layout from "../layout/Layout";

const PerformancePage = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Layout>
        <ClassPerformance />
      </Layout>
    </div>
  );
};

export default PerformancePage;
