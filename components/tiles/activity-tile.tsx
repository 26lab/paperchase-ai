"use client";

import { useJournal } from "@/lib/use-journal";
import { JournalList } from "../journal-list";
import { Tile } from "./tile";

export function ActivityTile() {
  return (
    <Tile title="Aktivität">
      <JournalList entries={useJournal()} limit={30} />
    </Tile>
  );
}
