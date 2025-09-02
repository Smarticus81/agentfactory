"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import {
	getAssistantName,
	getAssistantType,
	getAssistantDescription,
	getDefaultInstructions,
} from "@/lib/onboarding-utils";

type Step = 1 | 2 | 3 | 4 | 5;

const USER_TYPES = [
	{ value: "family", label: "Family" },
	{ value: "student", label: "Student" },
	{ value: "business", label: "Business" },
	{ value: "custom", label: "Custom" },
];

const FEATURE_OPTIONS = [
	"Email triage and drafting",
	"Calendar coordination",
	"Task tracking",
	"Web research",
	"Summarize docs and emails",
];

const GOAL_OPTIONS = [
	"Stay organized",
	"Save time",
	"Improve productivity",
	"Avoid missing important items",
	"Automate repetitive tasks",
];

export default function OnboardingPage() {
	const router = useRouter();
	const { isLoaded, isSignedIn, user } = useUser();

	const [step, setStep] = useState<Step>(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Step state
	const [userName, setUserName] = useState("");
	const [userType, setUserType] = useState<string>("business");
	const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
	const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
	const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
	const [voicePipeline, setVoicePipeline] = useState<string>("lite");
	const [wakeWord, setWakeWord] = useState<string>("Hey Smarticus");
	const [gmailEnabled, setGmailEnabled] = useState<boolean>(false);
	const [calendarEnabled, setCalendarEnabled] = useState<boolean>(false);

	// Restore from localStorage
	useEffect(() => {
		try {
			const saved = localStorage.getItem("smarticus-onboarding");
			if (saved) {
				const parsed = JSON.parse(saved);
				setStep(parsed.step ?? 1);
				setUserName(parsed.userName ?? "");
				setUserType(parsed.userType ?? "business");
				setSelectedUseCases(parsed.selectedUseCases ?? []);
				setSelectedGoals(parsed.selectedGoals ?? []);
				setVoiceEnabled(parsed.voiceEnabled ?? false);
				setVoicePipeline(parsed.voicePipeline ?? "lite");
				setWakeWord(parsed.wakeWord ?? "Hey Smarticus");
				setGmailEnabled(parsed.gmailEnabled ?? false);
				setCalendarEnabled(parsed.calendarEnabled ?? false);
			}
		} catch {}
	}, []);

	// Persist to localStorage
	useEffect(() => {
		const state = {
			step,
			userName,
			userType,
			selectedUseCases,
			selectedGoals,
			voiceEnabled,
			voicePipeline,
			wakeWord,
			gmailEnabled,
			calendarEnabled,
		};
		try {
			localStorage.setItem("smarticus-onboarding", JSON.stringify(state));
		} catch {}
	}, [
		step,
		userName,
		userType,
		selectedUseCases,
		selectedGoals,
		voiceEnabled,
		voicePipeline,
		wakeWord,
		gmailEnabled,
		calendarEnabled,
	]);

	const assistantPreview = useMemo(() => {
		const name = getAssistantName(userType, userName);
		const type = getAssistantType(userType);
		const description = getAssistantDescription(userType);
		const instructions = getDefaultInstructions(
			userType,
			selectedUseCases,
			selectedGoals
		);
		return { name, type, description, instructions };
	}, [userType, userName, selectedUseCases, selectedGoals]);

	const canContinue = useMemo(() => {
		if (step === 1) return Boolean(userType);
		if (step === 2) return selectedUseCases.length > 0;
		if (step === 3) return selectedGoals.length > 0;
		if (step === 4) return true; // voice optional
		if (step === 5) return true; // integrations optional
		return false;
	}, [step, userType, selectedUseCases, selectedGoals]);

	async function handleCreate() {
		if (!isLoaded) return;
		if (!isSignedIn || !user?.id) {
			router.push("/sign-in");
			return;
		}
		setLoading(true);
		setError(null);

		try {
			// Create agent
			const res = await fetch("/api/agents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: user.id,
					name: assistantPreview.name,
					type: assistantPreview.type,
					description: assistantPreview.description,
					instructions: assistantPreview.instructions,
					capabilities: selectedUseCases,
					voiceEnabled,
					voicePipeline,
					wakeWord,
				}),
			});

			if (!res.ok) {
				const t = await res.text();
				throw new Error(`Agent create failed: ${t}`);
			}
			const data = await res.json();
			const agentId = data?.id || data?.agent?._id;

			// Save integration prefs (best-effort)
			try {
				await fetch("/api/integrations/setup", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ gmailEnabled, calendarEnabled, agentId }),
				});
			} catch {}

			// Done → route to dashboard or agent designer
			localStorage.removeItem("smarticus-onboarding");
			router.push("/dashboard");
		} catch (e: any) {
			setError(e?.message || "Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	if (!isLoaded) {
		return (
			<div className="max-w-3xl mx-auto px-6 py-12">
				<p>Loading…</p>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto px-6 py-10">
			<h1 className="heading-lg">Get set up with Smarticus</h1>
			<p className="body-md mb-6">We’ll personalize your assistant in a few quick steps.</p>

			{/* Progress */}
			<div className="mb-8 flex items-center gap-2">
				{[1, 2, 3, 4, 5].map((n) => (
					<div
						key={n}
						className="h-2 rounded-full flex-1"
						style={{
							background: n <= step ? "var(--primary-orange)" : "var(--border-light)",
							transition: "background 200ms ease",
						}}
					/>
				))}
			</div>

			{error && (
				<div
					className="mb-4 p-3 rounded-md"
					style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}
				>
					{error}
				</div>
			)}

			{/* Step content */}
			{step === 1 && (
				<section className="card">
					<h2 className="heading-md mb-4">Tell us about you</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-2">Your name</label>
							<input
								value={userName}
								onChange={(e) => setUserName(e.target.value)}
								placeholder="e.g. Alex"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-2">Type</label>
							<select value={userType} onChange={(e) => setUserType(e.target.value)}>
								{USER_TYPES.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="mt-6">
						<p className="body-md">Preview</p>
						<div className="mt-2 p-4 rounded-md border" style={{ borderColor: "var(--border-light)" }}>
							<div className="font-semibold">{assistantPreview.name}</div>
							<div className="text-sm text-secondary">{assistantPreview.type}</div>
							<div className="text-sm mt-2">{assistantPreview.description}</div>
						</div>
					</div>
				</section>
			)}

			{step === 2 && (
				<section className="card">
					<h2 className="heading-md mb-4">Pick what it should help with</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{FEATURE_OPTIONS.map((f) => {
							const checked = selectedUseCases.includes(f);
							return (
								<label key={f} className="flex items-center gap-3 p-3 rounded-md border cursor-pointer" style={{ borderColor: checked ? "var(--primary-orange)" : "var(--border-light)" }}>
									<input
										type="checkbox"
										checked={checked}
										onChange={(e) => {
											setSelectedUseCases((prev) =>
												e.target.checked ? [...prev, f] : prev.filter((x) => x !== f)
											);
										}}
									/>
									<span>{f}</span>
								</label>
							);
						})}
					</div>
				</section>
			)}

			{step === 3 && (
				<section className="card">
					<h2 className="heading-md mb-4">What are your goals?</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{GOAL_OPTIONS.map((g) => {
							const checked = selectedGoals.includes(g);
							return (
								<label key={g} className="flex items-center gap-3 p-3 rounded-md border cursor-pointer" style={{ borderColor: checked ? "var(--primary-orange)" : "var(--border-light)" }}>
									<input
										type="checkbox"
										checked={checked}
										onChange={(e) => {
											setSelectedGoals((prev) =>
												e.target.checked ? [...prev, g] : prev.filter((x) => x !== g)
											);
										}}
									/>
									<span>{g}</span>
								</label>
							);
						})}
					</div>
					<div className="mt-6">
						<p className="body-sm text-secondary">These shape the assistant’s instructions.</p>
					</div>
				</section>
			)}

			{step === 4 && (
				<section className="card">
					<h2 className="heading-md mb-4">Voice settings (optional)</h2>
					<div className="flex items-center gap-3">
						<input
							id="voice-toggle"
							type="checkbox"
							checked={voiceEnabled}
							onChange={(e) => setVoiceEnabled(e.target.checked)}
						/>
						<label htmlFor="voice-toggle">Enable voice</label>
					</div>
					{voiceEnabled && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
							<div>
								<label className="block text-sm font-medium mb-2">Pipeline</label>
								<select value={voicePipeline} onChange={(e) => setVoicePipeline(e.target.value)}>
									<option value="lite">Lite</option>
									<option value="standard">Standard</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Wake word</label>
								<input value={wakeWord} onChange={(e) => setWakeWord(e.target.value)} />
							</div>
						</div>
					)}
				</section>
			)}

			{step === 5 && (
				<section className="card">
					<h2 className="heading-md mb-4">Connect services (optional)</h2>
					<div className="flex flex-col gap-3">
						<label className="flex items-center gap-3">
							<input type="checkbox" checked={gmailEnabled} onChange={(e) => setGmailEnabled(e.target.checked)} />
							<span>Gmail</span>
						</label>
						<label className="flex items-center gap-3">
							<input type="checkbox" checked={calendarEnabled} onChange={(e) => setCalendarEnabled(e.target.checked)} />
							<span>Google Calendar</span>
						</label>
					</div>
				</section>
			)}

			{/* Footer controls */}
			<div className="mt-6 flex items-center justify-between">
				<button
					className="btn-secondary"
					onClick={() => setStep((s) => (Math.max(1, s - 1) as Step))}
					disabled={step === 1 || loading}
				>
					Back
				</button>
				{step < 5 ? (
					<button
						className="btn-primary"
						onClick={() => canContinue && setStep((s) => (Math.min(5, s + 1) as Step))}
						disabled={!canContinue || loading}
					>
						Continue
					</button>
				) : (
					<button className="btn-primary" onClick={handleCreate} disabled={loading}>
						{loading ? "Creating…" : "Create my assistant"}
					</button>
				)}
			</div>
		</div>
	);
}

