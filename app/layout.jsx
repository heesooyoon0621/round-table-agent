import "./globals.css";

export const metadata = {
  title: "The Round Table — Chat",
  description: "Plain-English money talk, powered by Fireworks AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
