// Sistema "ahorita" (docs/DISENO.md §7).
export { Screen } from './Screen';
export { ScreenHeader } from './ScreenHeader';
export { Text, type TextTone } from './Text';
export { Button, type ButtonVariant } from './Button';
export { IconButton } from './IconButton';
export { Card } from './Card';
export { Icon, ICON_NAMES, type IconName } from './Icon';
export {
  BrandSymbol,
  Symbol,
  fruitHex,
  fruitOf,
  type FruitLike,
  type SymbolAnimation,
} from './Symbol';
export { Wordmark } from './Wordmark';
export { Avatar, initialOf } from './Avatar';
export { MoodBubble } from './MoodBubble';
export { FruitDot } from './FruitDot';
export { FruitPicker, blockedReason } from './FruitPicker';
export { AnswerCard } from './AnswerCard';
export { StatTile } from './StatTile';
export { Chip } from './Chip';
export { Segmented, type SegmentedOption } from './Segmented';
export { Input } from './Input';
export { FieldError } from './FieldError';
export { ListRow } from './ListRow';
export { ListGroup } from './ListGroup';
export { Sheet } from './Sheet';
export { Toast, ToastProvider, useToast } from './Toast';
export { Notice, type NoticeTone } from './Notice';
export { EmptyState, type EmptyArt } from './EmptyState';
export { LoadingSymbol } from './LoadingSymbol';
export { ArrivalOverlay } from './ArrivalOverlay';
export { TabBar, TAB_ICONS, type TabBarProps } from './TabBar';
export { Toggle } from './Toggle';
export { Checkbox } from './Checkbox';
export { DateField, digitsOnly, type DateParts } from './DateField';
export { TimeField } from './TimeField';
export { CodeInput, normalizeCode, CODE_ALPHABET, CODE_LENGTH } from './CodeInput';
export { InviteCode, spokenCode } from './InviteCode';
export { AvatarPicker } from './AvatarPicker';
export { PermissionNote, type PermissionKind, type PermissionStatus } from './PermissionNote';
export { SoftAskNote } from './SoftAskNote';
export { Divider } from './Divider';
export { Sticker } from './Sticker';
export { useArrive, useTapScale } from './motion';
export { ErrorFallback } from './ErrorFallback';
