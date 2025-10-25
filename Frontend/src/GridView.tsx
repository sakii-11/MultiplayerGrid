import { useState } from "react";

type Cell = string | null;
type Props = {
  grid: Cell[];
  onPlace: (cellIndex: number, char: string) => void;
  lockedUntil: number | null;
};

export default function GridView({ grid, onPlace, lockedUntil }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [charInput, setCharInput] = useState("");

  const handleCellClick = (i: number) => {
    if (grid[i]) return; 
    if (lockedUntil && Date.now() < lockedUntil) {
      alert("You can make the next move in some time.");
      return;
    }
    setSelected(i);
  };

  const submit = () => {
    if (selected === null) return;
    if (!charInput || charInput.length === 0) {
      alert("Enter a character.");
      return;
    }
    const char = Array.from(charInput)[0];
    onPlace(selected, char);
    setSelected(null);
    setCharInput("");
  };

  const cancel = () => {
    setSelected(null);
    setCharInput("");
  };

  return (
    <div className="grid-wrapper">
      <div className="grid">
        {grid.map((c, i) => (
          <div
            key={i}
            className={"cell " + (c ? "filled" : "") + (selected === i ? " selected" : "")}
            onClick={() => handleCellClick(i)}
          >
            <div className="cell-inner">{c || ""}</div>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div className="modal">
          <div className="modal-content">
            <h3>Place a character in cell {selected}</h3>
            <input
              placeholder="Type a character (emojis are allowed)"
              value={charInput}
              onChange={(e) => setCharInput(e.target.value)}
              maxLength={4}
            />
            <div className="modal-actions">
              <button onClick={submit}>Submit</button>
              <button onClick={cancel}>Cancel</button>
            </div>
            <small>Only the first character will be used.</small>
          </div>
        </div>
      )}
    </div>
  );
}
