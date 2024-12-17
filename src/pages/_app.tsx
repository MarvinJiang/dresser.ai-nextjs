import type { AppProps } from 'next/app'
import Layout from 'components/layout'
import '../globals.css'
import { AuthProvider } from 'contexts/AuthContext'


export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
    <Layout>
        <Component {...pageProps} />
    </Layout>
    </AuthProvider>
    )
}