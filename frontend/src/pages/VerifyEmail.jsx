import React, { useState } from "react";
import { toast } from "react-toastify";
import authService from "../services/authService";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function VerifyEmail() {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await authService.verifyEmail(token);
            if (response) {
                toast.success("Email verified successfully!");
                window.location.href = "/login";
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast.error(
                error.response?.data?.message || "Email verification failed"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        School Exam System
                    </h1>
                    <h2 className="mt-6 text-2xl font-bold text-gray-900">
                        Verify your email
                    </h2>
                </div>

                <Card className="mt-8">
                    {error && (
                        <div
                            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleVerify}>
                        <Input
                            label="Verification Code"
                            id="code"
                            name="code"
                            type="code"
                            required
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="Enter your code"
                        />

                        <div className="mt-6">
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                fullWidth
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Verifying" : "Verify Email"}
                            </Button>
                        </div>
                    </form>
                </Card>

                <p className="text-gray-500 text-sm text-center">
                    If you didn't receive a code,{" "}
                    <a href="/resend-verification" className="text-blue-500">
                        click here to resend
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
