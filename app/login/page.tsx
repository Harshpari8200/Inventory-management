"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/auth-schema";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "motion/react";
import { AppLogo } from "@/components/AppLogo";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const form = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const onSubmit = async (data: z.infer<typeof signInSchema>) => {
        setIsLoading(true);
        setError("");
        try {
            const { error } = await authClient.signIn.username({
                username: data.username,
                password: data.password,
                rememberMe: true,
            });
            if (error) throw new Error("Invalid Login Id or Password");
            router.push("/dashboard");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid Login Id or Password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background font-sans p-4 relative overflow-hidden">
            {/* Minimalist Background */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center mb-12">
                    <AppLogo className="mb-4" />
                </div>

                <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl shadow-background/50">
                    <h2 className="text-2xl font-semibold mb-8 text-center tracking-tight text-emerald-500 underline underline-offset-8 decoration-2">User Authentication</h2>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-4">
                                            <label className="text-sm font-medium min-w-[80px]">Login Id</label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter your Login Id"
                                                    className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage className="text-destructive ml-[96px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-4">
                                            <label className="text-sm font-medium min-w-[80px]">Password</label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="Enter password"
                                                    className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                />
                                            </FormControl>
                                        </div>
                                        <div className="flex justify-between items-center ml-[96px]">
                                            <FormMessage className="text-destructive" />
                                            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-emerald-500 transition-colors ml-auto">
                                                Forgot Password?
                                            </Link>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <p className="text-destructive text-sm font-medium text-center">
                                    Invalid Login Id or Password
                                </p>
                            )}

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-emerald-600 text-primary-foreground font-bold text-lg tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIGN IN"}
                                </Button>
                            </div>
                        </form>
                    </Form>

                    <div className="mt-8 text-center">
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Link href="/forgot-password" title="Forget Password?" className="hover:text-emerald-500 transition-colors">
                                Forget Password ?
                            </Link>
                            <span className="opacity-20">|</span>
                            <Link href="/register" className="text-emerald-500 hover:text-emerald-400 font-semibold hover:underline transition-all underline-offset-4">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
