export const metadata = {
  title: 'Cloud Health Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <script src="https://cdn.tailwindcss.com"></script>
      <body>{children}</body>
    </html>
  )
}
