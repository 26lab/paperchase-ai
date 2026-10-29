"use client";

import { motion } from "motion/react";
import { Responsive, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";
import { useSavedLayout } from "@/lib/use-saved-layout";
import { TILES } from "@/lib/tiles";
import { DRAG_HANDLE } from "./tiles/tile";

const BREAKPOINTS = { lg: 1180, md: 860, sm: 0 };
const COLS = { lg: 12, md: 8, sm: 4 };

export function DashboardGrid() {
  const { layout, update } = useSavedLayout();
  const { width, containerRef, mounted } = useContainerWidth();
  const visible = TILES.filter((tile) => !layout?.hidden.includes(tile.id));

  const onLayoutChange = (_current: Layout, all: ResponsiveLayouts) => {
    if (!layout) return;
    const layouts = Object.fromEntries(
      Object.entries(all).map(([bp, items]) => [bp, (items ?? []).map(({ i, x, y, w, h, minW, minH }) => ({ i, x, y, w, h, minW, minH }))]),
    );
    update({ ...layout, layouts });
  };

  return (
    <div ref={containerRef}>
      {mounted && layout && (
        <Responsive
          width={width}
          layouts={layout.layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={40}
          margin={[14, 14]}
          containerPadding={[0, 0]}
          dragConfig={{ handle: `.${DRAG_HANDLE}` }}
          onLayoutChange={onLayoutChange}
        >
          {visible.map((tile, index) => (
            <div key={tile.id}>
              <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}>
                {tile.render()}
              </motion.div>
            </div>
          ))}
        </Responsive>
      )}
    </div>
  );
}
