import { useMemo } from 'react';
import * as THREE from 'three';
import { useStarMapStore } from '../state/useStarMapStore';
import { computeEmpireTerritories, projectedStarsIncludingFocus } from '../utils/empires';

function buildTerritoryGeometry(positions: [number, number, number][]): THREE.BufferGeometry | null {
  if (positions.length < 3) return null;

  const y = positions[0][1];
  const cx = positions.reduce((sum, [x]) => sum + x, 0) / positions.length;
  const cz = positions.reduce((sum, [, , z]) => sum + z, 0) / positions.length;

  const vertices: number[] = [cx, y, cz];
  for (const [x, , z] of positions) {
    vertices.push(x, y, z);
  }

  const indices: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    indices.push(0, i, i + 1);
  }
  indices.push(0, positions.length, 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function TerritoryMesh({
  positions,
  color,
  dimmed,
}: {
  positions: [number, number, number][];
  color: string;
  dimmed: boolean;
}) {
  const geometry = useMemo(() => buildTerritoryGeometry(positions), [positions]);
  const opacity = dimmed ? 0.08 : 0.2;

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        fog={false}
      />
    </mesh>
  );
}

export function EmpireTerritories() {
  const toggles = useStarMapStore((s) => s.toggles);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const focusStar = useStarMapStore((s) => s.focusStar);
  const empires = useStarMapStore((s) => s.empires);
  const starAssignments = useStarMapStore((s) => s.starAssignments);
  const highlightedEmpireId = useStarMapStore((s) => s.highlightedEmpireId);

  const territories = useMemo(() => {
    if (!toggles.showPoliticalLayer || !toggles.showEmpireTerritories) return [];
    const stars = projectedStarsIncludingFocus(projectedStars, focusStar);
    return computeEmpireTerritories(stars, empires, starAssignments);
  }, [
    toggles.showPoliticalLayer,
    toggles.showEmpireTerritories,
    projectedStars,
    focusStar,
    empires,
    starAssignments,
  ]);

  if (territories.length === 0) return null;

  return (
    <>
      {territories.map((territory) => (
        <TerritoryMesh
          key={territory.empireId}
          positions={territory.positions}
          color={territory.color}
          dimmed={
            highlightedEmpireId !== null && territory.empireId !== highlightedEmpireId
          }
        />
      ))}
    </>
  );
}
