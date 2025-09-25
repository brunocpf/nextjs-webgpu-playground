import Link from "next/link";

export default function Home() {
  return (
    <>
      <header></header>

      <main>
        <h1>Welcome to the WebGPU Playground</h1>
        <p>Explore the power of GPU computing in your browser.</p>

        <ul>
          <li>
            <Link href="/example">Example Compute Shader</Link>
          </li>
          <li>
            <Link href="/custom">Custom Compute Shader</Link>
          </li>
        </ul>
      </main>

      <footer></footer>
    </>
  );
}
