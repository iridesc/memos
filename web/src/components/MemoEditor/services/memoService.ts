import { create } from "@bufbuild/protobuf";
import { FieldMaskSchema, timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";
import { isEqual } from "lodash-es";
import { memoServiceClient } from "@/connect";
import { shiftStalePlanTimeRange } from "@/lib/plan-time";
import type { Attachment } from "@/types/proto/api/v1/attachment_service_pb";
import { AttachmentSchema } from "@/types/proto/api/v1/attachment_service_pb";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";
import type { EditorState } from "../state";
import { uploadService } from "./uploadService";

/**
 * Converts attachments to reference format for API requests.
 * The backend only needs the attachment name to link it to a memo.
 */
function toAttachmentReferences(attachments: Attachment[]): Attachment[] {
  return attachments.map((a) => create(AttachmentSchema, { name: a.name }));
}

function buildUpdateMask(
  prevMemo: Memo,
  state: EditorState,
  allAttachments: typeof state.metadata.attachments,
): { mask: Set<string>; patch: Partial<Memo> } {
  const mask = new Set<string>();
  const patch: Partial<Memo> = {
    name: prevMemo.name,
    content: state.content,
  };

  if (!isEqual(state.content, prevMemo.content)) {
    mask.add("content");
    patch.content = state.content;
  }
  if (!isEqual(state.metadata.visibility, prevMemo.visibility)) {
    mask.add("visibility");
    patch.visibility = state.metadata.visibility;
  }
  if (!isEqual(allAttachments, prevMemo.attachments)) {
    mask.add("attachments");
    patch.attachments = toAttachmentReferences(allAttachments);
  }
  if (!isEqual(state.metadata.relations, prevMemo.relations)) {
    mask.add("relations");
    patch.relations = state.metadata.relations;
  }
  if (!isEqual(state.metadata.location, prevMemo.location)) {
    mask.add("location");
    patch.location = state.metadata.location;
  }

  // Auto-update timestamp is server-managed: the API refreshes update_time
  // whenever content / attachments / relations / location change.

  // A completed memo has a frozen timeline: the API rejects plan time and
  // create time changes, so they must not be part of the update at all.
  const isTimelineLocked = prevMemo.state === State.COMPLETED;

  // Handle custom create time
  if (!isTimelineLocked && state.timestamps.createTime) {
    const prevCreateTime = prevMemo.createTime ? timestampDate(prevMemo.createTime) : undefined;
    if (!isEqual(state.timestamps.createTime, prevCreateTime)) {
      mask.add("create_time");
      patch.createTime = timestampFromDate(state.timestamps.createTime);
    }
  }

  // Handle plan times
  if (!isTimelineLocked && state.timestamps.planStartTime !== undefined) {
    const prevPlanStart = prevMemo.planStartTime ? timestampDate(prevMemo.planStartTime) : undefined;
    if (!isEqual(state.timestamps.planStartTime?.getTime(), prevPlanStart?.getTime())) {
      mask.add("plan_start_time");
      patch.planStartTime = state.timestamps.planStartTime ? timestampFromDate(state.timestamps.planStartTime) : undefined;
    }
  } else if (!isTimelineLocked && prevMemo.planStartTime) {
    mask.add("plan_start_time");
    patch.planStartTime = undefined;
  }
  if (!isTimelineLocked && state.timestamps.planEndTime !== undefined) {
    const prevPlanEnd = prevMemo.planEndTime ? timestampDate(prevMemo.planEndTime) : undefined;
    if (!isEqual(state.timestamps.planEndTime?.getTime(), prevPlanEnd?.getTime())) {
      mask.add("plan_end_time");
      patch.planEndTime = state.timestamps.planEndTime ? timestampFromDate(state.timestamps.planEndTime) : undefined;
    }
  } else if (!isTimelineLocked && prevMemo.planEndTime) {
    mask.add("plan_end_time");
    patch.planEndTime = undefined;
  }

  return { mask, patch };
}

export const memoService = {
  async save(
    state: EditorState,
    options: {
      memoName?: string;
      parentMemoName?: string;
    },
  ): Promise<{ memoName: string; hasChanges: boolean; planTimeShifted?: boolean }> {
    // 1. Upload local files first
    const newAttachments = await uploadService.uploadFiles(state.localFiles);
    const allAttachments = [...state.metadata.attachments, ...newAttachments];

    // 2. Update existing memo
    if (options.memoName) {
      const prevMemo = await memoServiceClient.getMemo({ name: options.memoName });
      const { mask, patch } = buildUpdateMask(prevMemo, state, allAttachments);

      if (mask.size === 0) {
        return { memoName: prevMemo.name, hasChanges: false };
      }

      const memo = await memoServiceClient.updateMemo({
        memo: create(MemoSchema, patch as Record<string, unknown>),
        updateMask: create(FieldMaskSchema, { paths: Array.from(mask) }),
      });
      return { memoName: memo.name, hasChanges: true };
    }

    // 3. Create new memo or comment
    // A prefilled plan window goes stale while the editor stays open, and the
    // API rejects a plan start time in the past. A stale window is therefore
    // moved forward to the current time before it is sent.
    const planTimes = shiftStalePlanTimeRange(
      {
        planStartTime: state.timestamps.planStartTime,
        planEndTime: state.timestamps.planEndTime,
      },
      new Date(),
    );

    const memoData = create(MemoSchema, {
      content: state.content,
      visibility: state.metadata.visibility,
      attachments: toAttachmentReferences(allAttachments),
      relations: state.metadata.relations,
      location: state.metadata.location,
      createTime: state.timestamps.createTime ? timestampFromDate(state.timestamps.createTime) : undefined,
      planStartTime: planTimes.planStartTime ? timestampFromDate(planTimes.planStartTime) : undefined,
      planEndTime: planTimes.planEndTime ? timestampFromDate(planTimes.planEndTime) : undefined,
    });

    const memo = options.parentMemoName
      ? await memoServiceClient.createMemoComment({
          name: options.parentMemoName,
          comment: memoData,
        })
      : await memoServiceClient.createMemo({ memo: memoData });

    return { memoName: memo.name, hasChanges: true, planTimeShifted: planTimes.shifted };
  },

  /** Build editor state from an already-loaded Memo entity (no network request). */
  fromMemo(memo: Memo): EditorState {
    return {
      content: memo.content,
      metadata: {
        visibility: memo.visibility,
        attachments: memo.attachments,
        relations: memo.relations,
        location: memo.location,
      },
      ui: {
        isFocusMode: false,
        isLoading: { saving: false, uploading: false, loading: false },
        isComposing: false,
      },
      timestamps: {
        createTime: memo.createTime ? timestampDate(memo.createTime) : undefined,
        planStartTime: memo.planStartTime ? timestampDate(memo.planStartTime) : undefined,
        planEndTime: memo.planEndTime ? timestampDate(memo.planEndTime) : undefined,
      },
      localFiles: [],
      audioRecorder: {
        isSupported: true,
        permission: "unknown",
        status: "idle",
        elapsedSeconds: 0,
        error: undefined,
      },
    };
  },
};
