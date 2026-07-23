import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

const outfit = Outfit({
	variable: "--font-outfit",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Kids Progress Tracker",
	description: "Family activity and reward tracker with parent, child, and admin roles.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${outfit.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col font-sans">
				<AuthProvider>{children}</AuthProvider>
			</body>
		</html>
	);
}
