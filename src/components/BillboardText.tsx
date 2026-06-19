import { Billboard, Text, type TextProps } from '@react-three/drei';

type Props = TextProps & {
  children: string;
};

/** 3D text that always faces the camera. */
export function BillboardText({ children, position, ...textProps }: Props) {
  return (
    <Billboard position={position} follow>
      <Text anchorX="center" anchorY="middle" {...textProps}>
        {children}
      </Text>
    </Billboard>
  );
}
