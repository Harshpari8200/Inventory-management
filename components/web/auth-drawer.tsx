"use client"

import { useState, useEffect } from "react"
import { X, Mail, ArrowRight, ArrowLeft, Loader2, LogOut, User, Lock, KeyRound, Pencil, Check, Upload } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { put } from "@vercel/blob"
import { useRef } from "react"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signInSchema, signUpSchema, otpSchema } from "@/lib/auth-schema"
import { z } from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AuthDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type AuthStep = "email" | "password" | "otp" | "success" | "profile"

export function AuthDrawer({ open, onOpenChange }: AuthDrawerProps) {
    const [step, setStep] = useState<AuthStep>("email")
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const { data: session } = authClient.useSession()

    // Handle session state changes
    useEffect(() => {
        if (session && step !== "success") {
            setStep("profile")
        } else if (!session && step === "profile") {
            setStep("email")
        }
    }, [session, step])

    // Reset state when closing
    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen)
        if (!newOpen) {
            setTimeout(() => {
                if (!session) {
                    setStep("email")
                    setIsSignUp(false)
                    setEmail("")
                    setError("")
                }
            }, 300)
        }
    }

    const handleSuccess = () => {
        setStep("success")
        setTimeout(() => {
            handleOpenChange(false)
        }, 2000)
    }

    const handleSignOut = async () => {
        setIsLoading(true)
        try {
            await authClient.signOut()
            handleOpenChange(false)
        } catch {
            setError("Failed to sign out. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const [isEditingName, setIsEditingName] = useState(false)
    const [newName, setNewName] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpdateProfile = async () => {
        setIsLoading(true)
        try {
            const { error } = await authClient.updateUser({
                name: newName
            })
            if (error) throw error
            setIsEditingName(false)
        } catch {
            setError("Failed to update profile")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const filename = `${Date.now()}-${file.name}`
            const { url } = await put(filename, file, {
                access: "public",
                token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
            })

            const { error } = await authClient.updateUser({
                image: url
            })
            if (error) throw error
        } catch {
            setError("Failed to upload avatar")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                    onClick={() => handleOpenChange(false)}
                />
            )}

            <div
                role="dialog"
                aria-modal="true"
                className={cn(
                    "fixed left-1/2 bottom-0 -translate-x-1/2 z-50 w-full max-w-md transition-all duration-300",
                    open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
                )}
            >
                <div className="bg-[#0a0a0a] border-t border-x border-white/10 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto pb-safe">
                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-2 flex items-center justify-between">
                        {step !== "email" && step !== "success" && step !== "profile" && (
                            <button
                                onClick={() => {
                                    if (step === "otp") setStep("password")
                                    else setStep("email")
                                    setError("")
                                }}
                                className="p-2 -ml-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex-1 text-center pr-8">
                            {/* Spacer to center title if back button exists */}
                        </div>
                        <button
                            onClick={() => handleOpenChange(false)}
                            className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-6 pb-8">
                        {step !== "profile" && (
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    {step === "success" ? "Success!" :
                                        isSignUp ? "Create Account" :
                                            step === "otp" ? "Check your email" :
                                                step === "email" ? "Welcome" :
                                                    "Welcome Back"}
                                </h2>
                                <p className="text-zinc-400 text-sm">
                                    {step === "success" ? "You are now logged in." :
                                        step === "email" ? "Enter your email to continue." :
                                            step === "otp" ? `We sent a code to ${email}` :
                                                isSignUp ? "Set up your password to get started." : "Enter your password to sign in."}
                                </p>
                            </div>
                        )}

                        <div className="min-h-[200px]">
                            {step === "email" && (
                                <EmailForm
                                    email={email}
                                    setEmail={setEmail}
                                    setStep={setStep}
                                    setError={setError}
                                    error={error}
                                    isSignUp={isSignUp}
                                    setIsSignUp={setIsSignUp}
                                />
                            )}

                            {step === "password" && (
                                <PasswordForm
                                    email={email}
                                    isSignUp={isSignUp}
                                    onSuccess={handleSuccess}
                                    setStep={setStep}
                                    setError={setError}
                                    error={error}
                                    setIsLoading={setIsLoading}
                                    isLoading={isLoading}
                                />
                            )}

                            {step === "otp" && (
                                <OTPForm
                                    email={email}
                                    onSuccess={handleSuccess}
                                    setStep={setStep}
                                    setError={setError}
                                    error={error}
                                    setIsLoading={setIsLoading}
                                    isLoading={isLoading}
                                />
                            )}

                            {step === "success" && (
                                <div className="flex flex-col items-center animate-fade-in py-8">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-scaleup">
                                            <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === "profile" && session && (
                                <div className="flex flex-col items-center space-y-8 animate-fade-in pt-4">
                                    {/* Avatar */}
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/10 overflow-hidden group-hover:border-white/30 transition-all">
                                            {session.user.image ? (
                                                <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-10 h-10 text-zinc-400" />
                                            )}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                            <Pencil className="w-3 h-3 text-black" />
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                        />
                                    </div>

                                    <div className="w-full space-y-6">
                                        {/* Name Field */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-3.5 pointer-events-none">
                                                    <User className="w-5 h-5 text-zinc-500" />
                                                </div>
                                                <input
                                                    value={isEditingName ? newName : (session.user.name || "")}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    onFocus={() => {
                                                        setIsEditingName(true)
                                                        setNewName(session.user.name || "")
                                                    }}
                                                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                                                />
                                                <div className="absolute right-3 top-3">
                                                    {isEditingName ? (
                                                        <button
                                                            onClick={handleUpdateProfile}
                                                            disabled={isLoading}
                                                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                                        >
                                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <Check className="w-4 h-4 text-green-400" />}
                                                        </button>
                                                    ) : (
                                                        <Pencil className="w-4 h-4 text-zinc-600" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Email Field (Read-only) */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-3.5 pointer-events-none">
                                                    <Mail className="w-5 h-5 text-zinc-600" />
                                                </div>
                                                <input
                                                    value={session.user.email}
                                                    readOnly
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-zinc-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full pt-4 border-t border-white/5">
                                        <button
                                            onClick={handleSignOut}
                                            disabled={isLoading}
                                            className="w-full py-3.5 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>
                                                    <LogOut className="w-5 h-5" />
                                                    Sign Out
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

function EmailForm({ email, setEmail, setStep, error, isSignUp, setIsSignUp }: {
    email: string
    setEmail: (email: string) => void
    setStep: (step: AuthStep) => void
    setError: (error: string) => void
    error: string
    isSignUp: boolean
    setIsSignUp: (isSignUp: boolean) => void
}) {
    const form = useForm({
        defaultValues: { email: email },
        resolver: zodResolver(z.object({ email: z.string().email() }))
    })

    const onSubmit = (data: { email: string }) => {
        setEmail(data.email)
        setStep("password")
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="name@example.com"
                                        className="w-full pl-12 pr-4 py-6 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                                        autoFocus
                                    />
                                </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {error && <p className="text-red-400 text-sm ml-1">{error}</p>}

                <Button
                    type="submit"
                    className="w-full py-6 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                    Continue <ArrowRight className="w-5 h-5" />
                </Button>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                    <p className="text-sm text-zinc-400">
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm font-medium text-white hover:underline"
                    >
                        {isSignUp ? "Sign In" : "Create Account"}
                    </button>
                </div>
            </form>
        </Form>
    )
}

function PasswordForm({ email, isSignUp, onSuccess, setStep, setError, error, setIsLoading, isLoading }: {
    email: string
    isSignUp: boolean
    onSuccess: () => void
    setStep: (step: AuthStep) => void
    setError: (error: string) => void
    error: string
    setIsLoading: (isLoading: boolean) => void
    isLoading: boolean
}) {
    const schema = isSignUp ? signUpSchema : signInSchema
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: email,
            password: "",
            name: ""
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
    })

    const onSubmit = async (data: z.infer<typeof signUpSchema> | z.infer<typeof signInSchema>) => {
        setIsLoading(true)
        setError("")
        try {
            if (isSignUp && "name" in data) {
                const { error } = await authClient.signUp.email({
                    email: data.email,
                    password: data.password,
                    name: data.name,
                })
                if (error) throw error
                onSuccess()
            } else {
                const { error } = await authClient.signIn.email({
                    email: data.email,
                    password: data.password,
                    rememberMe: true
                })
                if (error) throw error
                onSuccess()
            }
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message)
            } else {
                setError(isSignUp ? "Something went wrong. Please try again." : "Invalid email or password")
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
                {isSignUp && (
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <div className="relative group">
                                    <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Your Name"
                                            className="w-full pl-12 pr-4 py-6 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Password"
                                        className="w-full pl-12 pr-4 py-6 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                                        autoFocus
                                    />
                                </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {error && <p className="text-red-400 text-sm ml-1">{error}</p>}

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-6 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? "Create Account" : "Sign In")}
                </Button>

                {!isSignUp && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={async () => {
                                setIsLoading(true)
                                try {
                                    const { error } = await authClient.emailOtp.sendVerificationOtp({
                                        email,
                                        type: "sign-in"
                                    })
                                    if (error) throw error
                                    setStep("otp")
                                } catch {
                                    setError("Failed to send OTP. Please try again.")
                                } finally {
                                    setIsLoading(false)
                                }
                            }}
                            className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Sign in with email code instead
                        </button>
                    </div>
                )}
            </form>
        </Form>
    )
}

function OTPForm({ email, onSuccess, setStep, setError, error, setIsLoading, isLoading }: {
    email: string
    onSuccess: () => void
    setStep: (step: AuthStep) => void
    setError: (error: string) => void
    error: string
    setIsLoading: (isLoading: boolean) => void
    isLoading: boolean
}) {
    const form = useForm({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            email: email,
            otp: ""
        }
    })

    const onSubmit = async (data: z.infer<typeof otpSchema>) => {
        setIsLoading(true)
        setError("")
        try {
            const { error } = await authClient.signIn.emailOtp({
                email: data.email,
                otp: data.otp
            })
            if (error) throw error
            onSuccess()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid OTP code. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
                <FormField
                    control={form.control}
                    name="otp"
                    render={({ field }) => (
                        <FormItem>
                            <div className="relative group">
                                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="Enter OTP"
                                        className="w-full pl-12 pr-4 py-6 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                                        autoFocus
                                    />
                                </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {error && <p className="text-red-400 text-sm ml-1">{error}</p>}

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-6 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign In"}
                </Button>

                <button
                    type="button"
                    onClick={() => setStep("password")}
                    className="w-full text-sm text-zinc-500 hover:text-white transition-colors"
                >
                    Use password instead
                </button>
            </form>
        </Form>
    )
}
