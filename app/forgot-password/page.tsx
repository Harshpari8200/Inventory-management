"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema, otpSchema } from "@/lib/auth-schema";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AppLogo } from "@/components/AppLogo";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { ArrowRight, Loader2, Mail, KeyRound, CheckCircle2, RotateCcw, Lock } from "lucide-react";

// The final step requires a new password.
const passwordResetSchema = z.object({
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/[a-z]/, { message: "Password must contain a lowercase letter" })
        .regex(/[A-Z]/, { message: "Password must contain an uppercase letter" })
        .regex(/[^a-zA-Z0-9]/, { message: "Password must contain a special character" }),
});

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<"email" | "otp" | "password" | "success">("email");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    const emailForm = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: { email: "", otp: "" },
    });

    const passwordForm = useForm<z.infer<typeof passwordResetSchema>>({
        resolver: zodResolver(passwordResetSchema),
        defaultValues: { password: "" },
    });

    const onEmailSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
        setIsLoading(true);
        setError("");
        const emailLower = data.email.toLowerCase();
        try {
            const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
                email: emailLower,
                type: "forget-password",
            });

            if (otpError) throw new Error(otpError.message || "Failed to send OTP");

            setEmail(emailLower);
            otpForm.setValue("email", emailLower);
            setStep("otp");
            setResendTimer(60);
        } catch (e: any) {
            setError(e.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setIsLoading(true);
        setError("");
        try {
            const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
                email: email,
                type: "forget-password",
            });
            if (otpError) throw new Error(otpError.message || "Failed to resend OTP");
            setResendTimer(60);
        } catch (e: any) {
            setError(e.message || "Failed to resend OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const onOtpSubmit = async (data: z.infer<typeof otpSchema>) => {
        setIsLoading(true);
        setError("");
        try {
            // Check if OTP is valid
            const { data: isValid, error: checkError } = await authClient.emailOtp.checkVerificationOtp({
                email: email,
                otp: data.otp,
                type: "forget-password",
            });

            if (checkError) throw new Error(checkError.message || "Invalid OTP");
            if (!isValid) throw new Error("Invalid or expired code");

            setOtp(data.otp);
            setStep("password");
        } catch (e: any) {
            setError(e.message || "Invalid OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const onPasswordSubmit = async (data: z.infer<typeof passwordResetSchema>) => {
        setIsLoading(true);
        setError("");
        try {
            const { error: resetError } = await authClient.emailOtp.resetPassword({
                email: email,
                otp: otp,
                password: data.password,
            });

            if (resetError) throw new Error(resetError.message || "Failed to reset password");

            setStep("success");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (e: any) {
            setError(e.message || "An error occurred during reset");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background font-sans p-4 relative overflow-hidden">
            {/* Minimalist Background */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center mb-12">
                    <AppLogo className="mb-4" />
                </div>

                <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl shadow-background/50 overflow-hidden relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {step === "email" && (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold mb-2 tracking-tight text-emerald-500">Reset Password</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Enter your email address and we&apos;ll send you a 6-digit code.
                                    </p>
                                </div>

                                <Form {...emailForm}>
                                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                                        <FormField
                                            control={emailForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center gap-4">
                                                        <label className="text-sm font-medium min-w-[80px] flex items-center gap-2">
                                                            <Mail className="w-4 h-4" /> Email
                                                        </label>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder="Enter your email"
                                                                className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                            />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage className="text-destructive ml-[96px]" />
                                                </FormItem>
                                            )}
                                        />

                                        {error && (
                                            <div className="text-destructive text-xs text-center bg-destructive/10 py-2 rounded-lg border border-destructive/20">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-4">
                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 shadow-lg shadow-emerald-500/20 transition-all group w-full sm:w-auto"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>Send Code <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>

                                <div className="text-center">
                                    <Link href="/login" className="text-sm text-muted-foreground hover:text-emerald-500 transition-colors">
                                        Back to login
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                        {step === "otp" && (
                            <motion.div
                                key="otp"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold mb-2 tracking-tight text-emerald-500">Enter Code</h2>
                                    <p className="text-sm text-muted-foreground">
                                        We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>.
                                    </p>
                                </div>

                                <Form {...otpForm}>
                                    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                                        <FormField
                                            control={otpForm.control}
                                            name="otp"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex flex-col gap-2">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder="123456"
                                                                maxLength={6}
                                                                className="bg-background/50 border-border focus:ring-emerald-500 h-16 rounded-2xl text-center tracking-[0.5em] font-mono text-2xl shadow-inner"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-destructive text-center" />
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        {error && (
                                            <div className="text-destructive text-xs text-center bg-destructive/10 py-2 rounded-lg border border-destructive/20">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-4">
                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 shadow-lg shadow-emerald-500/20 transition-all w-full"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    "Verify Code"
                                                )}
                                            </Button>

                                            <div className="flex items-center justify-between px-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setStep("email")}
                                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                                >
                                                    Change Email
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={resendTimer > 0 || isLoading}
                                                    onClick={handleResendOtp}
                                                    className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors disabled:text-muted-foreground flex items-center gap-1"
                                                >
                                                    <RotateCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                                                    {resendTimer > 0 ? `Resend In ${resendTimer}s` : "Resend Code"}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </Form>
                            </motion.div>
                        )}

                        {step === "password" && (
                            <motion.div
                                key="password"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold mb-2 tracking-tight text-emerald-500">Security Check</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Code verified! Now choose a strong new password.
                                    </p>
                                </div>

                                <Form {...passwordForm}>
                                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                                        <FormField
                                            control={passwordForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center gap-4">
                                                        <label className="text-sm font-medium min-w-[80px] flex items-center gap-2">
                                                            <Lock className="w-4 h-4" /> New Pass
                                                        </label>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                type="password"
                                                                placeholder="Enter new password"
                                                                className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                            />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage className="text-destructive ml-[96px]" />
                                                </FormItem>
                                            )}
                                        />

                                        {error && (
                                            <div className="text-destructive text-xs text-center bg-destructive/10 py-2 rounded-lg border border-destructive/20">
                                                {error}
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 shadow-lg shadow-emerald-500/20 transition-all w-full group"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>Update Password <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                            )}
                                        </Button>
                                    </form>
                                </Form>
                            </motion.div>
                        )}

                        {step === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-8 text-center"
                            >
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-semibold mb-2 tracking-tight text-foreground">All Set!</h2>
                                <p className="text-sm text-muted-foreground mb-8 max-w-[280px]">
                                    Your password was successfully updated. Redirecting you to the login screen...
                                </p>
                                <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Please wait</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
