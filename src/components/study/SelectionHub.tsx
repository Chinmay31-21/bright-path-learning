import { useState, useMemo } from 'react';
import { 
  Calculator, 
  FlaskConical, 
  Globe, 
  BookOpen,
  Code,
  Palette,
  Music,
  Languages,
  Loader2,
  GraduationCap,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type EducationBoard = 'cbse' | 'icse' | 'state';

interface Subject {
  id: string;
  name: string;
  board: EducationBoard;
  class_level: number;
  description: string | null;
  icon: string | null;
}

interface SelectionHubProps {
  subjects: Subject[];
  isLoading: boolean;
  selectedBoard: EducationBoard | null;
  selectedClass: number | null;
  onBoardChange: (board: EducationBoard | null) => void;
  onClassChange: (classLevel: number | null) => void;
  onSelectSubject: (subject: Subject) => void;
}

const boardLabels: Record<EducationBoard, string> = {
  cbse: 'CBSE',
  icse: 'ICSE',
  state: 'State Board'
};

const getSubjectIcon = (subjectName: string) => {
  const name = subjectName.toLowerCase();
  if (name.includes('math')) return Calculator;
  if (name.includes('physics') || name.includes('chemistry')) return FlaskConical;
  if (name.includes('biology') || name.includes('science')) return Globe;
  if (name.includes('computer') || name.includes('programming')) return Code;
  if (name.includes('art') || name.includes('draw')) return Palette;
  if (name.includes('music')) return Music;
  if (name.includes('english') || name.includes('hindi') || name.includes('language')) return Languages;
  return BookOpen;
};

const getSubjectColor = (subjectName: string) => {
  const name = subjectName.toLowerCase();
  if (name.includes('math')) return '#8B5CF6';
  if (name.includes('physics')) return '#10B981';
  if (name.includes('chemistry')) return '#F59E0B';
  if (name.includes('biology')) return '#EC4899';
  if (name.includes('computer')) return '#14B8A6';
  if (name.includes('english')) return '#3B82F6';
  if (name.includes('hindi')) return '#F97316';
  return '#6366F1';
};

const SelectionHub = ({
  subjects,
  isLoading,
  selectedBoard,
  selectedClass,
  onBoardChange,
  onClassChange,
  onSelectSubject
}: SelectionHubProps) => {
  // Get unique class levels and boards
  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(subjects.map(s => s.class_level))].sort((a, b) => a - b);
    return classes;
  }, [subjects]);

  const uniqueBoards = useMemo(() => {
    return [...new Set(subjects.map(s => s.board))] as EducationBoard[];
  }, [subjects]);

  // Filter subjects based on selection
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      if (selectedBoard && subject.board !== selectedBoard) return false;
      if (selectedClass && subject.class_level !== selectedClass) return false;
      return true;
    });
  }, [subjects, selectedBoard, selectedClass]);

  // Group filtered subjects by class
  const subjectsByClass = useMemo(() => {
    const grouped: Record<number, Subject[]> = {};
    filteredSubjects.forEach(subject => {
      if (!grouped[subject.class_level]) {
        grouped[subject.class_level] = [];
      }
      grouped[subject.class_level].push(subject);
    });
    return grouped;
  }, [filteredSubjects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading subjects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filter Controls */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Filter by:</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {/* Board Filter */}
            <Select 
              value={selectedBoard || 'all'} 
              onValueChange={(value) => onBoardChange(value === 'all' ? null : value as EducationBoard)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {uniqueBoards.map(board => (
                  <SelectItem key={board} value={board}>
                    {boardLabels[board]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Class Filter */}
            <Select 
              value={selectedClass?.toString() || 'all'} 
              onValueChange={(value) => onClassChange(value === 'all' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map(classLevel => (
                  <SelectItem key={classLevel} value={classLevel.toString()}>
                    Class {classLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(selectedBoard || selectedClass) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                onBoardChange(null);
                onClassChange(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Subject Grid */}
      {Object.keys(subjectsByClass).length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Subjects Found</h3>
          <p className="text-muted-foreground">
            No subjects match your current filters. Try adjusting your selection.
          </p>
        </div>
      ) : (
        Object.entries(subjectsByClass)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([classLevel, classSubjects], classIndex) => (
            <div 
              key={classLevel} 
              className="animate-fade-in"
              style={{ animationDelay: `${classIndex * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold text-foreground">Class {classLevel}</h2>
                <Badge variant="secondary">{classSubjects.length} Subjects</Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {classSubjects.map((subject, index) => {
                  const Icon = getSubjectIcon(subject.name);
                  const color = getSubjectColor(subject.name);
                  
                  return (
                    <button
                      key={subject.id}
                      onClick={() => onSelectSubject(subject)}
                      className="glass-card rounded-2xl p-6 text-left hover-lift group transition-all duration-300"
                      style={{ animationDelay: `${(classIndex * 100) + (index * 50)}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Icon className="w-6 h-6" style={{ color }} />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {boardLabels[subject.board]}
                        </Badge>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {subject.name}
                      </h3>
                      
                      {subject.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {subject.description}
                        </p>
                      )}
                      
                      <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                        View Chapters
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
};

export default SelectionHub;
