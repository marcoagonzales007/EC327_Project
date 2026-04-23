import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthScreen = () => {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            if (isSignup) {
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                const user = userCredential.user;

                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email || email,
                    createdAt: serverTimestamp(),
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message || "Authentication failed");
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
                <h1 className="text-3xl font-bold text-center mb-2">TuneSwipe</h1>
                <p className="text-center text-gray-400 mb-6">
                    {isSignup ? "Create your account" : "Log in to continue"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full rounded-lg bg-white/10 px-4 py-3 outline-none border border-white/10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full rounded-lg bg-white/10 px-4 py-3 outline-none border border-white/10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error ? (
                        <p className="text-red-400 text-sm">{error}</p>
                    ) : null}

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-green-500 text-black font-semibold py-3 hover:bg-green-400 transition"
                    >
                        {isSignup ? "Sign Up" : "Log In"}
                    </button>
                </form>

                <button
                    type="button"
                    className="w-full mt-4 text-sm text-gray-300"
                    onClick={() => setIsSignup((prev) => !prev)}
                >
                    {isSignup
                        ? "Already have an account? Log in"
                        : "Need an account? Sign up"}
                </button>
            </div>
        </div>
    );
};

export default AuthScreen;