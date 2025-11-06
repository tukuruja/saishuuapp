import React from 'react';
import { Loader2 } from 'lucide-react';

// ベースとなるProps
interface BaseProps {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
}

// 'button'としてレンダリングする場合のProps
type ButtonElementProps = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: 'button';
};

// 'a'（リンク）としてレンダリングする場合のProps
type AnchorElementProps = BaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: 'a';
    disabled?: boolean; 
};

// 'span'としてレンダリングする場合のProps
type SpanElementProps = BaseProps & React.HTMLAttributes<HTMLSpanElement> & {
    as: 'span';
    disabled?: boolean;
};

// Discriminated Union（判別可能な合併型）
type ButtonProps = ButtonElementProps | AnchorElementProps | SpanElementProps;


// React.forwardRefを使用してrefを受け渡す
export const Button = React.forwardRef<HTMLElement, ButtonProps>((props, ref) => {
  const {
    children,
    variant = 'primary',
    isLoading = false,
    fullWidth = false,
    className = '',
    as = 'button',
    ...rest
  } = props;

  const baseClasses =
    'flex items-center justify-center font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-tap-target px-4 py-2';
  
  const widthClass = fullWidth ? 'w-full' : '';

  const variantClasses = {
    primary: 'bg-action-blue text-white hover:bg-blue-600',
    secondary: 'bg-background-light text-text-primary hover:bg-gray-600',
    danger: 'bg-error-red text-white hover:bg-red-700',
  };

  // disabled状態を安全に判定
  const disabled = 'disabled' in props && props.disabled !== undefined ? props.disabled : false;
  const isDisabled = disabled || isLoading;

  const combinedClassName = `${baseClasses} ${widthClass} ${variantClasses[variant]} ${className}`;

  // 'as'プロパティの値（Discriminator）に基づいてレンダリングを分岐
  if (as === 'button') {
    return (
        <button
            {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            ref={ref as React.Ref<HTMLButtonElement>}
            className={combinedClassName}
            disabled={isDisabled}
        >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {children}
        </button>
    );
  }

  if (as === 'a') {
    return (
        <a
            {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            ref={ref as React.Ref<HTMLAnchorElement>}
            className={combinedClassName}
            aria-disabled={isDisabled}
            // リンクが無効化されている場合はクリックイベントを停止
            onClick={(e) => {
                if (isDisabled) {
                    e.preventDefault();
                    return;
                }
                // propsにonClickが存在する場合のみ実行
                (props as AnchorElementProps).onClick?.(e);
            }}
        >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {children}
        </a>
    );
  }

  // Default to span
  return (
    <span
        {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
        ref={ref as React.Ref<HTMLSpanElement>}
        className={combinedClassName}
        aria-disabled={isDisabled}
    >
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
        {children}
    </span>
  );
});

Button.displayName = 'Button';
