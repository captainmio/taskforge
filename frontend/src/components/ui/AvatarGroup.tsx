import InitialsAvatar from "./InitialsAvatar";

export interface AvatarGroupMember {
  id: number | string;
  name: string;
  imageUrl?: string;
}

interface AvatarGroupProps {
  members: readonly AvatarGroupMember[];
  max?: number;
  label?: string;
}

const AvatarGroup = ({
  members,
  max = 3,
  label = "Project members",
}: AvatarGroupProps) => {
  const visibleMembers = members.slice(0, max);
  const remainingCount = Math.max(0, members.length - visibleMembers.length);

  return (
    <div className="flex -space-x-2" aria-label={label}>
      {visibleMembers.map((member) =>
        member.imageUrl ? (
          <img
            key={member.id}
            src={member.imageUrl}
            alt={member.name}
            title={member.name}
            className="size-8 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <InitialsAvatar
            key={member.id}
            value={member.name}
            label={member.name}
            size="sm"
          />
        ),
      )}
      {remainingCount > 0 ? (
        <span
          className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 ring-2 ring-white"
          aria-label={`${remainingCount} more members`}
        >
          +{remainingCount}
        </span>
      ) : null}
    </div>
  );
};

export default AvatarGroup;
