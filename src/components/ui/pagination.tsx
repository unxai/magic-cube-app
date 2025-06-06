import * as React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from './button'

interface PaginationProps {
  total: number
  current: number
  onChange: (page: number) => void
}

/**
 * 分页组件
 * @param total 总页数
 * @param current 当前页码
 * @param onChange 页码改变回调
 */
export function Pagination({ total, current, onChange }: PaginationProps) {
  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // 最多显示的页码数
    const halfVisible = Math.floor(maxVisible / 2)

    if (total <= maxVisible) {
      // 总页数小于最大显示数，显示所有页码
      for (let i = 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 总页数大于最大显示数，需要显示省略号
      if (current <= halfVisible + 1) {
        // 当前页靠近开始
        for (let i = 1; i <= maxVisible - 2; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(total)
      } else if (current >= total - halfVisible) {
        // 当前页靠近结束
        pages.push(1)
        pages.push('...')
        for (let i = total - (maxVisible - 3); i <= total; i++) {
          pages.push(i)
        }
      } else {
        // 当前页在中间
        pages.push(1)
        pages.push('...')
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(total)
      }
    }

    return pages
  }

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => current > 1 && onChange(current - 1)}
        disabled={current === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <Button variant="ghost" size="icon" disabled>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant={current === page ? 'default' : 'outline'}
              onClick={() => typeof page === 'number' && onChange(page)}
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}

      <Button
        variant="outline"
        size="icon"
        onClick={() => current < total && onChange(current + 1)}
        disabled={current === total}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}