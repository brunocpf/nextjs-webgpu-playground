import Link from "next/link";

export default function Home() {
  return (
    <>
      <header></header>

      <main>
        <h1 className="text-4xl font-bold">Welcome to the WebGPU Playground</h1>
        <p>Explore the power of GPU computing in your browser.</p>

        <ul className="mt-4 list-inside list-disc space-y-2">
          <li className="hover:underline">
            <Link href="/example">Example Compute Shader</Link>
          </li>
          <li className="hover:underline">
            <Link href="/custom">Custom Compute Shader</Link>
          </li>
        </ul>
      </main>

      <footer></footer>
    </>
  );
}
