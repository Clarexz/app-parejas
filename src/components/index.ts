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
export { Avatar } from './Avatar';
export { MoodBubble } from './MoodBubble';
export { FruitDot } from './FruitDot';
export { FruitPicker, blockedReason } from './FruitPicker';
export { AnswerCard } from './AnswerCard';
export { StatTile } from './StatTile';
export { Chip } from './Chip';
export { Segmented, type SegmentedOption } from './Segmented';
export { Input } from './Input';
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
export { PermissionNote, type PermissionStatus } from './PermissionNote';
export { SoftAskNote } from './SoftAskNote';
export { Divider } from './Divider';
export { Sticker } from './Sticker';
export { useArrive, useStickIn, useTapScale } from './motion';

// Adaptadores de la Bitácora: se quitan al rediseñar las pantallas que aún los usan.
export {
  CloudOff,
  EmptyPolaroid,
  PencilNote,
  Scene,
  WaitingIllustration,
  type SceneKind,
} from './illustrations';
export { Paper, type PaperVariant } from './Paper';
export { Stamp, type StampTone } from './Stamp';
export { Tape, type TapeColor } from './Tape';
export { Doodle } from './Doodle';
export { FoldedNote } from './FoldedNote';
export { Note } from './Note';
export { Polaroid } from './Polaroid';
export { PageHeader } from './PageHeader';
export { LoadingLines } from './LoadingLines';
export { SealOverlay } from './SealOverlay';
export { Tally, TallyLine } from './Tally';
export { GridScore } from './GridScore';
export { GridColumns, filledCells, type GridColumn } from './GridColumns';
