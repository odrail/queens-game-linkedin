import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Giscus from "@giscus/react";
import Board from "./components/Board";
import { createEmptyBoard } from "../../utils/board";
import { checkWinCondition, getClashingQueens } from "../../utils/gameLogic";
import { levels } from "../../utils/levels";
import BackIcon from "../icons/BackIcon";
import PreviousIcon from "../icons/PreviousIcon";
import NextIcon from "../icons/NextIcon";
import ResetIcon from "../icons/ResetIcon";
import WinningScreen from "./components/WinningScreen";
import Queen from "../Queen";
import HowToPlay from "./components/HowToPlay";
import SettingsDialog from "./components/SettingsDialog";
import Timer from "./components/Timer";
import {
  getShowClockPreference,
  getAutoPlaceXsPreference,
  getClashingQueensPreference,
  getShowInstructionsPreference,
  isLevelCompleted,
  markLevelAsCompleted,
  setShowClockPreference,
  setAutoPlaceXsPreference,
  setClashingQueensPreference,
  setShowInstructionsPreference,
} from "../../utils/localStorage";
import getNavigationLevels from "@/utils/getNavigationLevels";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import Button from "../Button";
import useVisibility from '../../hooks/useVisibility'

const Level = ({ id, level }) => {
  const { theme } = useTheme();

  const levelSize = levels[level].size;

  const [board, setBoard] = useState(createEmptyBoard(levelSize));
  const [queenGeneratedXs, setQueenGeneratedXs] = useState({}); // Track Xs generated by each queen

  const [hasWon, setHasWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showWinningScreen, setShowWinningScreen] = useState(false);
  const [clashingQueens, setClashingQueens] = useState(new Set());
  const [showClashingQueens, setShowClashingQueens] = useState(
    getClashingQueensPreference,
  );
  const [showInstructions, setShowInstructions] = useState(
    getShowInstructionsPreference,
  );
  const [showClock, setShowClock] = useState(getShowClockPreference);
  const [autoPlaceXs, setAutoPlaceXs] = useState(getAutoPlaceXsPreference);
  const { t, i18n } = useTranslation();
  const history = useRef([]);
  const isVisible = useVisibility();
  const [timerRunning, setTimerRunning] = useState(false);

  const { previousLevel, nextLevel, previousDisabled, nextDisabled } =
    getNavigationLevels(id, level);

  const boardSize = levelSize;
  const colorRegions = levels[level].colorRegions;

  const completed = isLevelCompleted(Number(id));

  // Handle click on square
  const handleSquareClick = (row, col) => {
    // Initialize newBoard as a copy of the current board
    const newBoard = structuredClone(board);

    const currentValue = board[row][col];

    if (currentValue === null) {
      newBoard[row][col] = "X";
      addToHistory({ row, col, symbol: "X" });
    } else if (currentValue === "X") {
      placeQueen(newBoard, row, col);
      addToHistory({ row, col, symbol: "Q" });
    } else if (currentValue === "Q") {
      removeQueen(newBoard, row, col);
      addToHistory({ row, col, symbol: null });
    }

    // Check for win condition after updating the board
    if (checkWinCondition(newBoard, boardSize, colorRegions)) {
      if (!hasWon) {
        setTimeout(() => setShowWinningScreen(true), 0);
      }
      setHasWon(true);
      markLevelAsCompleted(Number(id));
    } else {
      setHasWon(false);
      setShowWinningScreen(false);
    }

    // Update clashing queens
    const clashingPositions = getClashingQueens(
      newBoard,
      boardSize,
      colorRegions,
    );
    const clashingSet = new Set(
      clashingPositions.map(({ row, col }) => `${row},${col}`),
    );
    setClashingQueens(clashingSet);

    setBoard(newBoard);
  };

  const handleDrag = (squares) => {
    const newBoard = structuredClone(board);
    for (const [row, col] of squares) {
      if (newBoard[row][col] !== "Q") {
        newBoard[row][col] = "X";
        addToHistory({ row, col, symbol: "X" });
      }
    }
    setBoard(newBoard);
  };

  const getQueenPositionForGivenX = (xRow, xCol, newBoard) => {
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1], // Row and column
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1], // Diagonals
    ];

    // Check immediate row, column, and diagonal neighbors
    for (const [dRow, dCol] of directions) {
      const newRow = xRow + dRow;
      const newCol = xCol + dCol;
      if (
        newRow >= 0 &&
        newRow < newBoard.length &&
        newCol >= 0 &&
        newCol < newBoard[0].length &&
        newBoard[newRow][newCol] === "Q"
      ) {
        return { x: newRow, y: newCol }; // Another queen requires this 'X' cell
      }
    }

    // Check full row and column for any queens
    for (let i = 0; i < newBoard.length; i++) {
      if (newBoard[xRow][i] === "Q") {
        return { x: xRow, y: i };
      }
      if (newBoard[i][xCol] === "Q") {
        return { x: i, y: xCol };
      }
    }

    // Check the color region for any queens
    const regionColor = colorRegions[xRow][xCol];
    for (let r = 0; r < newBoard.length; r++) {
      for (let c = 0; c < newBoard[0].length; c++) {
        if (
          colorRegions[r][c] === regionColor && // Same region
          newBoard[r][c] === "Q" // Queen present
        ) {
          return { x: r, y: c };
        }
      }
    }

    return null; // No queens require this 'X' cell
  };

  const placeQueen = (newBoard, row, col) => {
    newBoard[row][col] = "Q"; // Place the queen

    if (!autoPlaceXs) return;

    const newXs = [];
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1], // Row and column
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1], // Diagonals
    ];

    // Add X's around the queen
    directions.forEach(([dRow, dCol]) => {
      const xRow = row + dRow;
      const xCol = col + dCol;
      if (
        xRow >= 0 &&
        xRow < newBoard.length &&
        xCol >= 0 &&
        xCol < newBoard[0].length &&
        newBoard[xRow][xCol] === null
      ) {
        newBoard[xRow][xCol] = "X";
        newXs.push([xRow, xCol]);
      }
    });

    // Add X's in the row and column
    for (let i = 0; i < newBoard.length; i++) {
      if (newBoard[row][i] === null) {
        newBoard[row][i] = "X";
        newXs.push([row, i]);
      }
      if (newBoard[i][col] === null) {
        newBoard[i][col] = "X";
        newXs.push([i, col]);
      }
    }

    // Add X's in the same color region
    const queenRegion = colorRegions[row][col];
    for (let r = 0; r < newBoard.length; r++) {
      for (let c = 0; c < newBoard[0].length; c++) {
        if (
          colorRegions[r][c] === queenRegion && // Same region
          newBoard[r][c] === null // Empty square
        ) {
          newBoard[r][c] = "X";
          newXs.push([r, c]);
        }
      }
    }

    // Track the X's generated by this queen
    setQueenGeneratedXs((prev) => {
      const updated = { ...prev };
      newXs.forEach(([xRow, xCol]) => {
        const key = `${xRow},${xCol}`;
        if (!updated[key]) {
          updated[key] = new Set();
        }
        updated[key].add(`${row},${col}`);
      });
      return updated;
    });
  };

  const removeQueen = (newBoard, row, col) => {
    newBoard[row][col] = null; // Remove the queen

    if (!autoPlaceXs) return;

    const queenKey = `${row},${col}`;

    setQueenGeneratedXs((prev) => {
      const updated = { ...prev };

      // Check all cells generated by this queen to see if they are needed by other queens
      Object.keys(updated).forEach((xKey) => {
        if (updated[xKey].has(queenKey)) {
          // Temporarily remove this queen's ownership
          updated[xKey].delete(queenKey);

          // Parse the coordinates of the 'X' cell
          const [xRow, xCol] = xKey.split(",").map(Number);

          const queenPos = getQueenPositionForGivenX(xRow, xCol, newBoard);

          // Check if any other queen still needs this 'X' cell
          if (!queenPos) {
            newBoard[xRow][xCol] = null; // Remove X if no queens depend on it
            delete updated[xKey]; // Remove entry if no queens left
          } else {
            updated[xKey].add(`${queenPos.x},${queenPos.y}`);
          }
        }
      });
      return updated;
    });
  };

  const addToHistory = ({ row, col, symbol }) => {
    history.current.push({
      row,
      col,
      symbol,
    });
  };

  const toggleClashingQueens = () => {
    const newSetting = !showClashingQueens;
    setShowClashingQueens(newSetting);
    setClashingQueensPreference(newSetting);
  };

  const toggleShowInstructions = () => {
    const newSetting = !showInstructions;
    setShowInstructions(newSetting);
    setShowInstructionsPreference(newSetting);
  };

  const toggleShowClock = () => {
    const newSetting = !showClock;
    setShowClock(newSetting);
    setShowClockPreference(newSetting);
  };

  const toggleAutoPlaceXs = () => {
    const newSetting = !autoPlaceXs;
    setAutoPlaceXs(newSetting);
    setAutoPlaceXsPreference(newSetting);
  };

  const handleTimeUpdate = (time) => {
    setTimer(time);
  };

  const handleUndo = () => {
    const newBoard = structuredClone(board);
    const latest = history.current.pop();

    if (!latest) return;
    if (latest.symbol == "X") {
      newBoard[latest.row][latest.col] = null;
    } else if (latest.symbol == "Q") {
      removeQueen(newBoard, latest.row, latest.col);
      newBoard[latest.row][latest.col] = "X";
    } else if (latest.symbol == null) {
      placeQueen(newBoard, latest.row, latest.col);
    }
    setBoard(newBoard);
  };

  const PreviousLevelButton = ({ children, className }) => {
    return (
      <Link
        to={previousDisabled ? "#" : `/level/${previousLevel}`}
        className="flex"
      >
        <button
          disabled={previousDisabled}
          onClick={() => {
            setBoard(createEmptyBoard(levels[`level${previousLevel}`].size));
          }}
          className={className}
        >
          {children}
        </button>
      </Link>
    );
  };

  const NextLevelButton = ({ children, className }) => {
    return (
      <Link to={nextDisabled ? "#" : `/level/${nextLevel}`} className="flex">
        <button
          disabled={nextDisabled}
          onClick={() => {
            setBoard(createEmptyBoard(levels[`level${nextLevel}`].size));
          }}
          className={className}
        >
          {children}
        </button>
      </Link>
    );
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Update clashing queens
    const clashingPositions = getClashingQueens(board, boardSize, colorRegions);
    const clashingSet = new Set(
      clashingPositions.map(({ row, col }) => `${row},${col}`),
    );
    setClashingQueens(clashingSet);
  }, [board]);

  useEffect(() => {
    if (!isVisible || hasWon) {
      setTimerRunning(false)
    }
    if (isVisible && !hasWon) {
      setTimerRunning(true)
    }
  }, [isVisible, hasWon])

  return (
    <div key={id} className="flex flex-col justify-center items-center pt-4">
      <div className="flex flex-col items-center">
        <div>
          <div
            className={`flex items-center space-x-4 sm:space-x-0 sm:justify-between py-1 w-full ${
              showClock ? "mb-0" : "mb-2"
            }`}
          >
            <Link to="/" className="flex-none">
              <button className="border border-slate-500 rounded-full p-2">
                <BackIcon />
              </button>
            </Link>

            <div className="flex items-center space-x-2">
              <PreviousLevelButton className="disabled:opacity-50">
                <PreviousIcon />
              </PreviousLevelButton>

              <h2 className="text-xl text-center">
                {t("LEVEL")} {id}
              </h2>

              <NextLevelButton className="disabled:opacity-50">
                <NextIcon />
              </NextLevelButton>
            </div>

            <div className="flex flex-1 sm:flex-none justify-end">
              <div className="relative flex items-center">
                {completed && (
                  <Queen
                    size="24"
                    className="absolute right-full top-1/2 transform -translate-y-1/2 fill-yellow-400 mr-2"
                  />
                )}
                <button
                  onClick={() => {
                    setBoard(createEmptyBoard(levelSize));
                    setHasWon(false);
                    setShowWinningScreen(false);
                    history.current = [];
                  }}
                  className="border border-slate-500 rounded-full p-2 mr-2"
                >
                  <ResetIcon size="18" />
                </button>
                <SettingsDialog
                  showClashingQueens={showClashingQueens}
                  toggleShowClashingQueens={toggleClashingQueens}
                  showInstructions={showInstructions}
                  toggleShowInstructions={toggleShowInstructions}
                  showClock={showClock}
                  toggleShowClock={toggleShowClock}
                  autoPlaceXs={autoPlaceXs}
                  toggleAutoPlaceXs={toggleAutoPlaceXs}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Timer
              run={timerRunning}
              onTimeUpdate={handleTimeUpdate}
              showTimer={showClock}
            />
          </div>

          <div className="game relative">
            {showWinningScreen && (
              <WinningScreen
                timer={showClock && timer}
                previousLevel={previousLevel}
                nextLevel={nextLevel}
                level={id}
                close={() => setShowWinningScreen(false)}
              />
            )}
            <Board
              board={board}
              handleSquareClick={handleSquareClick}
              handleSquareMouseEnter={handleDrag}
              level={level}
              showClashingQueens={showClashingQueens}
              clashingQueens={clashingQueens}
            />
          </div>
          <Button
            className="border border-slate-500 rounded-full p-2 mr-2 w-full mt-[16px]"
            onClick={handleUndo}
            disabled={hasWon || !history.current.length}
          >
            {t("UNDO")}
          </Button>
        </div>

        {showInstructions && <HowToPlay />}

        <div className="w-full px-2">
          <Giscus
            repo="samimsu/queens-game-linkedin"
            repoId="R_kgDONCfeAg"
            category="Announcements"
            categoryId="DIC_kwDONCfeAs4CnIas"
            mapping="pathname"
            strict="0"
            reactionsEnabled="1"
            emitMetadata="0"
            inputPosition="bottom"
            theme={theme}
            lang={i18n.language}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
};

export default Level;
