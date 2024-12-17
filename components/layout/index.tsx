import type { NextPage } from "next"
import Navbar from "components/Navbar"
import Footer from "components/Footer"


import { ReactNode } from "react";

interface LayoutProps {
    children: ReactNode;
}

const Layout: NextPage<LayoutProps> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow container mx-auto p-4">{ children }</main>
            <Footer />
        </div>
    )
}

export default Layout