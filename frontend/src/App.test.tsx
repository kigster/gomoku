import React from "react";
import { render, screen } from "@testing-library/react";
import Game from "./game";

test("renders Gomoku title", () => {
  render(<Game />);
  const titleElement = screen.getByText(/Gomoku/i);
  expect(titleElement).toBeInTheDocument();
});

test("renders game board", () => {
  render(<Game />);
  // Check that there are multiple buttons (game board cells)
  const buttons = screen.getAllByRole("button");
  expect(buttons.length).toBeGreaterThan(200); // 15x15 = 225 cells plus other buttons
});

test("shows login button when not authenticated", () => {
  render(<Game />);
  const loginButton = screen.getByText("Login");
  expect(loginButton).toBeInTheDocument();
});
