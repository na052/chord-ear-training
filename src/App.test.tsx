import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import App from "./App";
import { loadResults } from "./domain/storage";
function setup() {
  const audio = {
    playChord: vi.fn().mockResolvedValue(true),
    playArpeggio: vi.fn().mockResolvedValue(true),
    playReference: vi.fn().mockResolvedValue(true),
    stop: vi.fn(),
    dispose: vi.fn(),
    setVolume: vi.fn(),
  };
  const view = render(<App createAudioEngine={() => audio} />);
  return { audio, user: userEvent.setup(), ...view };
}
it("completes practice, records hints, prevents duplicate answers and retains history", async () => {
  const { user, audio, unmount } = setup();
  await user.click(screen.getByRole("button", { name: /スタート/ }));
  expect(screen.queryByText(/構成音/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /低い音/ }));
  await user.click(screen.getByRole("button", { name: /基準音/ }));
  expect(audio.playArpeggio).toHaveBeenCalledOnce();
  for (let i = 0; i < 10; i++) {
    fireEvent.keyDown(window, { key: "1", code: "Digit1" });
    fireEvent.keyDown(window, { key: "2", code: "Digit2" });
    expect(screen.getByText(/構成音/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: i === 9 ? /結果を見る/ : /次の問題へ/,
      }),
    );
  }
  expect(
    screen.getByRole("heading", { name: "おつかれさまでした。" }),
  ).toBeInTheDocument();
  expect(loadResults().results[0]).toMatchObject({
    total: 10,
    hintCount: 1,
    mode: "practice",
  });
  unmount();
  setup();
  expect(screen.queryByText(/最初の10問から/)).not.toBeInTheDocument();
});
it("hides both helpers in test mode; shortcuts do not hijack controls", async () => {
  const { user, audio } = setup();
  await user.click(screen.getByRole("button", { name: /テスト/ }));
  await user.click(screen.getByRole("button", { name: /スタート/ }));
  expect(
    screen.queryByRole("button", { name: /ヒント|基準音/ }),
  ).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("slider"), { key: "1" });
  expect(screen.queryByText(/構成音/)).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: " ", code: "Space" });
  await waitFor(() => expect(audio.playChord).toHaveBeenCalledOnce());
  await user.click(screen.getByRole("button", { name: /再生停止/ }));
  expect(audio.stop).toHaveBeenCalled();
});
it("shows actionable audio errors and permits retry", async () => {
  const { user, audio } = setup();
  audio.playChord.mockRejectedValueOnce(new Error("audio denied"));
  await user.click(screen.getByRole("button", { name: /スタート/ }));
  await user.click(screen.getByRole("button", { name: /コードを再生/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "音声を再生できません",
  );
  await user.click(screen.getByRole("button", { name: /コードを再生/ }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
