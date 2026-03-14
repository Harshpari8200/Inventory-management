"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/auth-schema";

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

const extendedSignUpSchema = signUpSchema.extend({
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const convex = useConvex();

    const form = useForm<z.infer<typeof extendedSignUpSchema>>({
        resolver: zodResolver(extendedSignUpSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: z.infer<typeof extendedSignUpSchema>) => {
        setIsLoading(true);
        setError("");
        try {
            // Check Login ID uniqueness against the betterAuth user table
            const result = await convex.query(api.users.findMany, {
                model: "user",
                where: [{ field: "name", value: data.name }],
                limit: 1,
                paginationOpts: { numItems: 1, cursor: null },
            });
            if (result && result.page && result.page.length > 0) {
                setError("This Login Id is already taken. Please choose another.");
                return;
            }

            const { error: signUpError } = await authClient.signUp.email({
                email: data.email,
                password: data.password,
                name: data.name,
                username: data.name,
            });
            if (signUpError) throw signUpError;
            router.push("/dashboard");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Registration failed. Please try again.");
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
                className="w-full max-w-xl"
            >
                <div className="flex flex-col items-center mb-12">
                    <AppLogo className="mb-4" />
                </div>

                <div className="bg-card border border-border rounded-3xl p-10 shadow-2xl shadow-background/50">
                    <h2 className="text-2xl font-semibold mb-10 text-center tracking-tight text-emerald-500">User Registration</h2>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-6">
                                            <label className="text-sm font-medium min-w-[140px]">Create Login Id</label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="6-12 characters"
                                                    className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage className="text-destructive ml-[164px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-6">
                                            <label className="text-sm font-medium min-w-[140px]">Enter Email Id</label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="example@mail.com"
                                                    className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage className="text-destructive ml-[164px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-6">
                                            <label className="text-sm font-medium min-w-[140px]">Enter Password</label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="8+ chars, A-Z, 0-9, #"
                                                    className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage className="text-destructive ml-[164px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-6">
                                            <label className="text-sm font-medium min-w-[140px]">Confirm Password</label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="Re-enter password"
                                                    className="bg-background/50 border-border focus:ring-emerald-500 h-12 rounded-xl"
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage className="text-destructive ml-[164px]" />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <p className="text-destructive text-sm font-medium text-center">
                                    {error}
                                </p>
                            )}

                            <div className="pt-6 flex justify-center">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-12 h-14 rounded-xl bg-primary hover:bg-emerald-600 text-primary-foreground font-bold text-lg tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "COMPLETE REGISTRATION"}
                                </Button>
                            </div>
                        </form>
                    </Form>

                    <div className="mt-8 text-center border-t border-border pt-6">
                        <motion.p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-semibold hover:underline transition-colors">
                                Sign in
                            </Link>
                        </motion.p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
