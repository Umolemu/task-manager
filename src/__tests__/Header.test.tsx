import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { HashRouter } from "react-router-dom";
import Header from "../components/Header";

describe("Header", () => {
  it("renders brand and theme toggle", () => {
    render(
      <HashRouter>
        <Header />
      </HashRouter>
    );
    expect(screen.getByText("TaskLite")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /toggle theme/i })
    ).toBeInTheDocument();
  });
});
