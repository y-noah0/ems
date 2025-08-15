import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../services/authService";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function VerifyEmail() {
    const [token, setToken] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const CODE_LENGTH = 6;

    useEffect(() => {
        // Get email from navigation state
        if (location.state?.email) {
            setEmail(location.state.email);
        }
    }, [location.state]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");
        
        console.log("Verifying email:", email, "with token:", token);
        
        if (!email) {
            setError("Email is required for verification");
            setIsSubmitting(false);
            return;
        }
        
        try {
            const response = await authService.verifyEmail({ email, token });
            if (response) {
                toast.success("Email verified successfully!");
                navigate("/login");
            }
        } catch (error) {
            console.error("Verification error:", error);
            const errorMessage = error.response?.data?.message || error.message || "Email verification failed";
            setError(errorMessage);
            toast.error(errorMessage);
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
                
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code<span className="text-red-500 ml-1">*</span></label>
                            <div className="flex justify-around" onPaste={(e)=>{
                                const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^0-9A-Z]/g,'').slice(0,CODE_LENGTH);
                                if(!pasted) return;
                                e.preventDefault();
                                setToken(pasted);
                                // Fill inputs
                                requestAnimationFrame(()=>{
                                    for(let i=0;i<pasted.length;i++){
                                        const el = document.getElementById(`code-box-${i}`);
                                        if(el) el.value = pasted[i];
                                    }
                                    const next = document.getElementById(`code-box-${pasted.length-1}`);
                                    next && next.focus();
                                });
                            }}>
                {Array.from({length: CODE_LENGTH}).map((_,idx)=> (
                                    <input
                                        key={idx}
                                        id={`code-box-${idx}`}
                    type="text"
                    inputMode="text"
                                        maxLength={1}
                    pattern="[A-Za-z0-9]"
                    autoComplete="one-time-code"
                    className="w-8 h-10 text-center text-xl font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm uppercase tracking-wider"
                                        defaultValue={token[idx]||''}
                                        onChange={(e)=>{
                                            const v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g,'');
                                            e.target.value = v;
                                            let newToken = token.split('');
                                            newToken[idx] = v;
                                            const joined = newToken.join('').slice(0,CODE_LENGTH);
                                            setToken(joined);
                                            if(v && idx < CODE_LENGTH-1){
                                                const next = document.getElementById(`code-box-${idx+1}`);
                                                next && next.focus();
                                            }
                                        }}
                                        onKeyDown={(e)=>{
                                            if(e.key==='Backspace' && !e.currentTarget.value && idx>0){
                                                const prev = document.getElementById(`code-box-${idx-1}`);
                                                prev && prev.focus();
                                            }
                                            if(e.key==='ArrowLeft' && idx>0){
                                                const prev = document.getElementById(`code-box-${idx-1}`);
                                                prev && prev.focus();
                                                e.preventDefault();
                                            }
                                            if(e.key==='ArrowRight' && idx < CODE_LENGTH-1){
                                                const next = document.getElementById(`code-box-${idx+1}`);
                                                next && next.focus();
                                                e.preventDefault();
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Enter the 6-character code (letters & numbers) sent to your email.</p>
                        </div>

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
