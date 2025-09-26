import Link from "next/link";

export default function Home() {
  return (
    <section>
      <nav className="mt-4">
        <ul className="mt-4 list-inside space-y-2">
          <li className="hover:underline">
            <Link href="/compute-shader" className="text-blue-500">
              Compute Shader Example
            </Link>
          </li>
          <li className="hover:underline">
            <Link href="/render-shader" className="text-blue-500">
              Render Shader Example
            </Link>
          </li>
        </ul>
      </nav>
    </section>
  );
}
