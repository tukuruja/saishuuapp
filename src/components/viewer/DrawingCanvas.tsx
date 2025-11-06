'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Text, Circle, Group } from 'react-konva';
import useImage from 'use-image';
import { useDrawingStore, Point } from '@/store/useDrawingStore';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';

interface DrawingCanvasProps {
  imageUrl: string;
  imageSize: { width: number; height: number };
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ imageUrl, imageSize }) => {
  const [image] = useImage(imageUrl);
  const { 
    tool, 
    addTempPoint, 
    tempPoints, 
    calculateAndSetScale,
    addMeasurement,
    measurements 
  } = useDrawingStore();
  
  const stageRef = useRef<StageType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    if (typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        }
    } else {
        return () => {
            window.removeEventListener('resize', handleResize);
        }
    }
  }, []);

  useEffect(() => {
    if (image && stageRef.current && imageSize.width > 0 && stageSize.width > 0) {
      const stage = stageRef.current;
      const scale = Math.min(
        stageSize.width / imageSize.width,
        stageSize.height / imageSize.height
      ) * 0.95;
      stage.scale({ x: scale, y: scale });
      stage.position({
        x: (stageSize.width - imageSize.width * scale) / 2,
        y: (stageSize.height - imageSize.height * scale) / 2,
      });
      if (typeof stage.batchDraw === 'function') {
        stage.batchDraw();
      }
    }
  }, [image, imageSize, stageSize]);


  const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool === 'move' || !stageRef.current) return;
    
    if (e.target.getClassName() !== 'Image' && e.target.getClassName() !== 'Text') return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    const point = transform.point(pos);

    const isComplete = addTempPoint(point);

    if (isComplete) {
        const currentPoints = useDrawingStore.getState().tempPoints;
        if (currentPoints.length !== 2) return;

        if (tool === 'scale') {
            const distanceStr = prompt("この2点間の実際の距離(mm)を入力してください:");
            if (distanceStr) {
                const distance = parseFloat(distanceStr);
                if (!isNaN(distance) && distance > 0) {
                    calculateAndSetScale(distance);
                } else {
                    alert("無効な数値です。");
                    useDrawingStore.getState().clearTempPoints();
                }
            } else {
                useDrawingStore.getState().clearTempPoints();
            }
        } else if (tool === 'measure') {
            addMeasurement(currentPoints[0], currentPoints[1]);
        }
    }
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    if (newScale < 0.1 || newScale > 10) return;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    if (typeof stage.batchDraw === 'function') {
        stage.batchDraw();
    }
  };
  
  const cursorStyle = tool === 'move' ? 'grab' : 'crosshair';

  const colorBlue = "#007AFF";
  const colorYellow = "#FFCC00";
  const colorWhite = "#FFFFFF";

  return (
    <div ref={containerRef} className="w-full h-full" style={{ cursor: cursorStyle }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        ref={stageRef}
        draggable={tool === 'move'}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onDragStart={() => { if(tool === 'move' && containerRef.current) containerRef.current.style.cursor = 'grabbing'; }}
        onDragEnd={() => { if(tool === 'move' && containerRef.current) containerRef.current.style.cursor = 'grab'; }}
      >
        <Layer>
          <KonvaImage image={image} width={imageSize.width} height={imageSize.height} />
          
          {measurements.map((m) => {
            const [p1, p2] = m.points;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const lengthText = `${m.realLength.toFixed(1)} mm`;

            return (
              <Group key={m.id}>
                <Line points={[p1.x, p1.y, p2.x, p2.y]} stroke={colorYellow} strokeWidth={3} lineCap="round" />
                <Circle x={p1.x} y={p1.y} radius={6} fill={colorYellow} />
                <Circle x={p2.x} y={p2.y} radius={6} fill={colorYellow} />
                <Group x={midX} y={midY - 15}>
                    <Text 
                        text={lengthText}
                        fontSize={18}
                        fill={colorWhite}
                        padding={5}
                        offsetX={40} 
                        offsetY={10}
                    />
                </Group>
              </Group>
            );
          })}

          {tempPoints.map((p, i) => (
            <Circle key={`temp-${i}`} x={p.x} y={p.y} radius={8} fill={tool === 'scale' ? colorBlue : colorYellow} stroke={colorWhite} strokeWidth={2} />
          ))}

          {tempPoints.length === 1 && (
            <Text 
                text={tool === 'measure' ? "2点目を選択" : "基準の終点を選択"} 
                x={tempPoints[0].x + 15} 
                y={tempPoints[0].y - 15} 
                fontSize={16} 
                fill={tool === 'scale' ? colorBlue : colorYellow} 
            />
          )}

          {tempPoints.length === 2 && (
            <Line 
                points={[tempPoints[0].x, tempPoints[0].y, tempPoints[1].x, tempPoints[1].y]} 
                stroke={tool === 'scale' ? colorBlue : colorYellow} 
                strokeWidth={4} 
                dash={[10, 5]}
            />
          )}

        </Layer>
      </Stage>
    </div>
  );
};
