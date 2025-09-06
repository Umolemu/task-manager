import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { HashRouter } from "react-router-dom";
import Projects from "../pages/Projects";
import { ToastProvider } from "../components/ToastProvider";

describe("Projects page", () => {
  it("renders title and controls", () => {
    render(
      <HashRouter>
        <ToastProvider>
          <Projects />
        </ToastProvider>
      </HashRouter>
    );
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new project/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search projects/i)).toBeInTheDocument();
  });
});
