export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body style={{ margin: 0, backgroundColor: '#020617' }}>
        {children}
      </body>
    </html>
  )
}
