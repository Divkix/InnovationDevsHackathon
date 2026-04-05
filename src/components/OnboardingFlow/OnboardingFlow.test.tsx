import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/context/AppContext";
import OnboardingFlow from "./OnboardingFlow";

function renderWithProvider() {
  return render(
    <AppProvider>
      <OnboardingFlow onComplete={vi.fn()} />
    </AppProvider>,
  );
}

describe("OnboardingFlow preferences", () => {
  beforeEach(() => {
    (localStorage as unknown as { _store: Map<string, string> })._store.clear();
    vi.clearAllMocks();
  });

  it("renders the language and voice preference controls", () => {
    renderWithProvider();

    expect(screen.getByTestId("onboarding-preferences")).toBeInTheDocument();
    expect(screen.getByTestId("language-en")).toBeInTheDocument();
    expect(screen.getByTestId("language-es")).toBeInTheDocument();
    expect(screen.getByTestId("language-hi")).toBeInTheDocument();
    expect(screen.getByTestId("voiceEnabled")).toBeInTheDocument();
    expect(screen.getByTestId("ttsEnabled")).toBeInTheDocument();
  });

  it("persists language and voice preferences from onboarding", () => {
    renderWithProvider();

    fireEvent.click(screen.getByTestId("language-es"));
    fireEvent.click(screen.getByTestId("voiceEnabled"));
    fireEvent.click(screen.getByTestId("ttsEnabled"));

    const storage = localStorage as unknown as {
      _store: Map<string, string>;
    };

    expect(storage._store.get("insurescope_language")).toBe("es");
    expect(storage._store.get("insurescope_voiceEnabled")).toBe("false");
    expect(storage._store.get("insurescope_ttsEnabled")).toBe("false");
  });
});
