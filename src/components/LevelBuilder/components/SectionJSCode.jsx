import React from "react";
import { colorNames } from "../../../utils/colors";
import { queensGameRepoNewLevelFile } from "@/data/links";
import { useTranslation } from "react-i18next";

const SectionJSCode = ({
  jsCode,
  setJsCode,
  copied,
  setCopied,
  levelName,
  board,
  regionColors,
}) => {
  const generateLevelJSCode = (levelNumber, board, regionColors) => {
    // Get the unique regions used in the board
    const usedRegions = new Set(board.flat().filter(Boolean));

    // Filter the regionColors based on used regions
    const usedRegionColors = Object.entries(regionColors).filter(([region]) =>
      usedRegions.has(region),
    );

    // Get the color variable names for the used colors
    const usedColorVariables = usedRegionColors
      .map(([, color]) => colorNames[color])
      .filter(Boolean);

    // Remove duplicate color variables
    const uniqueColorVariables = [...new Set(usedColorVariables)];

    // Create the import statement only with used colors
    const importStatement = `import { ${uniqueColorVariables
      .sort()
      .join(", ")} } from "../colors";`;

    // Create the regionColors content dynamically with the color variable names
    const regionColorsEntries = usedRegionColors
      .map(([region, color]) => `    ${region}: ${colorNames[color]}`)
      .join(",\n");

    // Generate the JS file content
    const jsContent = `
${importStatement}

const level${levelNumber} = {
  size: ${board.length},
  colorRegions: ${JSON.stringify(board, null, 2)},
  regionColors: {
${regionColorsEntries}
  }
};

export default level${levelNumber};
`;

    setJsCode(jsContent);
  };

  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-start">
      <div className="flex justify-between space-x-2 w-full mb-3">
        <button
          onClick={() => generateLevelJSCode(levelName, board, regionColors)}
          className="border border-slate-500 rounded-full py-1 px-3"
        >
          {t("GENERATE_CODE")}
        </button>

        <button
          onClick={() => setJsCode("")}
          className="border border-slate-500 rounded-full py-1 px-3"
        >
          {t("CLEAR_CODE")}
        </button>
      </div>

      <div className="h-full w-full">
        <div className="relative h-full w-full sm:w-fit">
          <textarea
            value={jsCode}
            className="border rounded border-slate-500 px-2 py-0.5 h-96 sm:h-full w-full sm:w-96 overflow-y-scroll"
            disabled
          />

          <div className="absolute top-2 right-5 flex flex-col items-center">
            <button
              onClick={async (e) => {
                navigator.clipboard.writeText(jsCode);
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                }, 1500);
              }}
              className="bg-background border border-slate-500 rounded-xl py-0.5 px-1.5 text-sm disabled:opacity-50 opacity-75 hover:opacity-100"
              disabled={!jsCode}
            >
              {t("COPY_CODE")}
            </button>
            {copied && (
              <div className="text-sm text-foreground">{t("COPIED")}!</div>
            )}
          </div>
        </div>

        <div>
          {t("ADD_THIS_CODE_TO")}{" "}
          <a
            href={queensGameRepoNewLevelFile}
            target="_blank"
            rel="noopener noreferrer"
          >
            <code className="bg-[#1f1f1f] text-[#cccccc]">
              src/utils/levels/
              <span className="text-[#50b8fe]">level{levelName}.js</span>
            </code>
          </a>
        </div>
      </div>
    </div>
  );
};

export default SectionJSCode;
