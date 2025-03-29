import { useMemo } from "react";
// @ts-ignore
import LevelButton from "@/components/LevelSelection/components/LevelButton";
// @ts-ignore
import { getOrderedLevels } from "../../../../utils/getAvailableLevels";
import filterLevel from "./filterLevel";
import { LevelSelectionFilters } from "../../interfaces";

interface UngroupedLevelsGridProps extends LevelSelectionFilters {
  className: string;
};

const orderedLevels = getOrderedLevels();
const totalLevels = Math.max(...orderedLevels);
const getArrayOfLevels = () =>
  Array.from({ length: totalLevels }, (_, i) => i + 1);

const getUngroupedLevelFiltered = ({ showOnlyAvailableLevels, hideCompletedLevels }: LevelSelectionFilters): number[] => {
  return getArrayOfLevels().filter((level) =>
    filterLevel(level, orderedLevels, {
      showOnlyAvailableLevels,
      hideCompletedLevels,
    })
  )
}

const UngroupedLevelsGrid: React.FC<UngroupedLevelsGridProps> = ({
  showOnlyAvailableLevels,
  hideCompletedLevels,
  className,
}) => {
  const ungroupedLevelsFiltered = useMemo(() => getUngroupedLevelFiltered({ showOnlyAvailableLevels, hideCompletedLevels }), [showOnlyAvailableLevels, hideCompletedLevels]);

  return (
    <div
      className={`grid grid-cols-8 sm:grid-cols-10 gap-1 p-1 text-sm ${className}`}
    >
      {ungroupedLevelsFiltered.map((level) => (
        <LevelButton
          key={level}
          level={level}
          disabled={!orderedLevels.includes(level)}
        />
      ))}
    </div>
  );
};

export default UngroupedLevelsGrid;
